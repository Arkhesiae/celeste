import Center from '../../models/Center.js';
import User from '../../models/User.js';
import Team from '../../models/Team.js';
import Rotation from '../../models/Rotation.js';
import { findOrThrow } from '../../utils/mongo.js';
import { todayIn } from '../../utils/dates/plainDate.js';
import { endTeamMembership } from '../team/team.membership.js';
import { getCenterTimeZone } from './center.timezone.js';

/**
 * Suppression (logique) d'un centre, de ses tours de service et de ses équipes. Ses utilisateurs en sont détachés ; leurs équipes
 * passées restent (le planning passé en dépend) et ils n'ont plus d'équipe à partir d'aujourd'hui (jour du centre).
 *
 * Pas de transaction : la base de production peut être un serveur seul, où elle échouerait (known issue #21). Le centre est donc
 * marqué supprimé **en dernier** : après un échec en cours de route il est toujours là, et relancer la suppression la termine (chaque
 * étape peut être rejouée). Ne pas remonter cette écriture.
 * @param {string} id - centre ; 404 s'il n'existe pas
 */
export async function deleteCenter (id) {
    const center = await findOrThrow(Center, id, { message: 'Centre non trouvé' });

    const today = todayIn(await getCenterTimeZone(id)).toString();
    for (const member of await User.find({ centerId: id }).select('teams')) {
        // updateOne et non save : un ancien compte qui ne passe plus la validation du schéma ne doit pas bloquer la suppression
        await User.updateOne(
            { _id: member._id },
            { $unset: { centerId: "" }, $set: { teams: endTeamMembership(member.teams, today) } }
        );
    }

    await Rotation.updateMany({ centerId: id }, { $set: { deleted: true } });
    await Team.updateMany({ center: id }, { $set: { deleted: true } });

    center.deleted = true;
    await center.save();
}
