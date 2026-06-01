import * as authService from '../services/auth/index.js';
import User from '../models/User.js';
import { AppError } from '../error/appError.js';

const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
};


const loginUser = async (req, res, next) => {
    try {
        const { email, password } = req.body;

        const result = await authService.loginUser(email, password);

        const response = {
            userData: result.userData,
            accessToken: result.accessToken
        };

        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, { ...COOKIE_OPTIONS, maxAge: 365 * 24 * 60 * 60 * 1000 });
        }

        res.json(response);
    } catch (error) {
        next(error);
    }
}

const refreshAccessToken = async (req, res, next) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            throw new AppError('Token manquant', 401, 'AUTH_TOKEN_MISSING');
        }

        const result = await authService.refreshAccessToken(refreshToken);

        const response = {
            userData: result.userData,
            accessToken: result.accessToken
        };

        res.json(response);
    } catch (error) {
        res.clearCookie("refreshToken", COOKIE_OPTIONS);
        next(error);
    }
}


const revokeRefreshToken = async (refreshToken) => {
    const payload = authService.verifyRefreshToken(refreshToken); // throws if invalid
    await User.updateOne(
        { _id: payload.userId },
        { $pull: { refreshTokens: { token: refreshToken } } }
    );
}

const logout = async (req, res, next) => {
    const refreshToken = req.cookies?.refreshToken;

    if (refreshToken) {
        try {
            await revokeRefreshToken(refreshToken);
        } catch (error) {
            console.error('Logout: token révocation échouée:', error.message);
        }
    }

    res.clearCookie('refreshToken', COOKIE_OPTIONS);
    return res.status(200).json({ message: 'Déconnexion réussie' });
};

const requestPasswordReset = async (req, res, next) => {
    try {
        const { email } = req.body;

        const result = await authService.requestPasswordReset(email);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

const resetPassword = async (req, res, next) => {
    try {
        const { token, newPassword } = req.body;

        const result = await authService.resetPassword(token, newPassword);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

const verifyPassword = async (req, res, next) => {
    try {
        const { currentPassword } = req.body;

        if (!currentPassword) {
            throw new AppError('Mot de passe manquant', 400);
        }

        const result = await authService.verifyPassword(req.user.userId, currentPassword);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

const updatePassword = async (req, res, next) => {
    try {
        const { newPassword } = req.body;

        const result = await authService.updatePassword(req.user.userId, newPassword);

        res.json(result);
    } catch (error) {
        next(error);
    }
}

export default {
    loginUser,
    refreshAccessToken,
    logout,
    requestPasswordReset,
    resetPassword,
    verifyPassword,
    updatePassword
};
