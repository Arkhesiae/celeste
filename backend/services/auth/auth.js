import { birthDayOf } from '../../utils/dates/dayAccess.js';


/**
 * Formats a user document into a clean, serializable payload
 * @param {Object} user - Mongoose user document
 * @param {string} accessToken
 * @returns {Object} User payload
 */
export function userPayload (user, accessToken) {
    const { phoneNumber, birthDate } = user.personalData ?? {};
    return {
        userId: user._id,
        name: user.name,
        email: user.email,
        phone: phoneNumber ?? '',
        birthDate: birthDate ?? '',
        birthDay: birthDayOf(user) ?? '',   // jumeau « jour » (YYYY-MM-DD), repli signalé sur birthDate
        isAdmin: user.isAdmin,
        adminType: user.adminType,
        centerId: user.centerId,
        avatar: user.avatar,
        status: user.registrationStatus,
        preferences: user.preferences,
        accessToken,
    };
}


