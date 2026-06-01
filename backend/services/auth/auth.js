

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
        isAdmin: user.isAdmin,
        adminType: user.adminType,
        centerId: user.centerId,
        avatar: user.avatar,
        status: user.registrationStatus,
        preferences: user.preferences,
        accessToken,
    };
}


