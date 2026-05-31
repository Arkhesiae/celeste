export function errorHandler (err, req, res, next) {
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal Server Error';

    console.log(" ❌ Erreur : ", message);

    if (status === 500) {
        console.log(err)
        console.log("(Error 500)");
    }

    res.status(status).json({ error: message, code: err.code });
}