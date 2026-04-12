import * as authService from '../services/auth/authService.js';
import * as resetPasswordService from '../services/auth/resetPasswordService.js';
import User from '../models/User.js';



const loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const result = await authService.loginUser(email, password);

        const response = {
            userData: result.userData,
            accessToken: result.accessToken
        };

        if (result.refreshToken) {
            res.cookie("refreshToken", result.refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production', // true en production, false en dev
                sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax',
                maxAge: 365 * 24 * 60 * 60 * 1000 // 365 jours
            });
        }

        res.json(response);
    } catch (error) {
        console.error('Erreur lors de la connexion:', error);

        if (error.code === 'USER_NOT_FOUND' || error.code === 'INVALID_PASSWORD') {
            return res.status(401).json({ code : error.code, error: error.message });
        }

        next(error);
    }
}

const refreshAccessToken = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (!refreshToken) {
            return res.status(401).json({ code : 'AUTH_TOKEN_MISSING', error: 'Token manquant' });
        }

        const result = await authService.refreshAccessToken(refreshToken);

        const response = {
            userData: result.userData,
            accessToken: result.accessToken
        };

        res.json(response);
    } catch (error) {
        console.error('Erreur lors du rafraîchissement du token : ', error.message);

        res.clearCookie("refreshToken", {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        });

        if (error.code === 'INVALID_REFRESH_TOKEN') {
            return res.status(401).json({ code : error.code, error: error.message });
        }

        next(error);
    }
}

const logout = async (req, res) => {
    try {
        const refreshToken = req.cookies?.refreshToken;

        if (refreshToken) {
            try {
                const payload = authService.verifyRefreshToken(refreshToken);

                await User.updateOne(
                    { _id: payload.userId },
                    { $pull: { refreshTokens: { token: refreshToken } } }
                );
            } catch (error) {
                console.error('Erreur lors de la vérification du token:', error);
            }
        }

    } catch (error) {
        console.error('Erreur lors de la déconnexion:', error);
       
    } finally {
        res.clearCookie('refreshToken', {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: process.env.NODE_ENV === 'production' ? 'strict' : 'lax'
        });
        return res.status(200).json({ message: 'Déconnexion réussie' });
    }
};

const requestPasswordReset = async (req, res) => {
    try {
        const { email } = req.body;

        const result = await resetPasswordService.requestPasswordReset(email);

        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la demande de réinitialisation:', error);
        next(error);
    }
}

const resetPassword = async (req, res) => {
    try {
        const { token, newPassword } = req.body;

        const result = await resetPasswordService.resetPassword(token, newPassword);

        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la réinitialisation du mot de passe:', error);
        next(error);
    }
}

const verifyPassword = async (req, res) => {
    try {
        const { currentPassword } = req.body;

        const result = await resetPasswordService.verifyPassword(req.user.userId, currentPassword);

        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la vérification du mot de passe:', error);
        next(error);
    }
}

const updatePassword = async (req, res) => {
    try {
        const { newPassword } = req.body;

        const result = await resetPasswordService.updatePassword(req.user.userId, newPassword);

        res.json(result);
    } catch (error) {
        console.error('Erreur lors de la mise à jour du mot de passe:', error);
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
