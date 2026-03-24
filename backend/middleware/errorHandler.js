export function errorHandler (err, req, res, next) {
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal Server Error';

    if (status === 500) {
        console.log("Error");
        console.error(err); // only log unexpected errors
    }

    res.status(status).json({ error: message });
}