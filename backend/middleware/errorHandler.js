export function errorHandler (err, req, res, next) {
    const status = err.status ?? 500;
    const message = err.message ?? 'Internal Server Error';
    console.error(message);  

    if (status === 500) {
        console.log("Error");
        console.error(err); 
    }

    res.status(status).json({ error: message });
}