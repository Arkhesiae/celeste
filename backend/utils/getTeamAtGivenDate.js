const startOfUtcDay = (value) => {
    if (value == null) return null;
    const d = new Date(value);
    if (Number.isNaN(d.getTime())) return null;
    d.setUTCHours(0, 0, 0, 0);
    return d.getTime();
};

/**
 * Retourne l'occurrence d'équipe applicable à une date calendaire (jour UTC).
 * Compare les jours, pas les timestamps — sinon un fromDate "15h" exclut le jour même.
 */
export const getTeamAtGivenDate = (teamOccurences, date) => {
    if (!Array.isArray(teamOccurences) || !teamOccurences.length) return null;

    const target = startOfUtcDay(date);
    if (target == null) return null;

    const sortedTeamOccurences = teamOccurences
        .slice()
        .sort((a, b) => new Date(b.fromDate) - new Date(a.fromDate));

    for (const team of sortedTeamOccurences) {
        const from = startOfUtcDay(team.fromDate);
        const to = team.toDate != null ? startOfUtcDay(team.toDate) : null;
        if (from == null) continue;

        if (to != null) {
            if (from <= target && target <= to) return team;
        }
    }

    for (const team of sortedTeamOccurences) {
        const from = startOfUtcDay(team.fromDate);
        if (from == null) continue;
        if (team.toDate == null && from <= target) return team;
    }

    return null;
};
