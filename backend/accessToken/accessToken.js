// Verify Access Token Middleware
const jwt = require('jsonwebtoken');


const verifyAccessToken = (req, res, next) => {
    // Get the access token from the request header
    const accessToken = req.headers.accesstoken
    if (!accessToken) {
        // If access token is not present, send 401 Unauthorized response
        return res.status(401).json({ message: 'Access token missing' })
    }

    // Verify the access token using jwt.verify() function
    jwt.verify(accessToken, 'secret', (error, decoded) => {
        if (error) {
            // If access token is not valid, send 401 Unauthorized response

            return res.status(401).json({ message: 'Invalid access token' })
        }
        // Set the decoded user data in the request object for further use
        req.user = decoded


        // Call the next middleware or route handler
        next()
    })

}

const verifyAdmin = (req, res, next) => {
    // Get the access token from the request header
    const accessToken = req.headers.accesstoken

    if (!accessToken) {
        // If access token is not present, send 401 Unauthorized response
        return res.status(401).json({ message: 'Access token missing' })
    }

    // Verify the access token using jwt.verify() function
    jwt.verify(accessToken, 'secret', (error, decoded) => {
        if (error) {
            // If access token is not valid, send 401 Unauthorized response

            return res.status(401).json({ message: 'Invalid access token' })
        }

        console.log(decoded)

        if (!decoded.admin){
            console.log('NOT ADMIN')
            return res.status(401).json({ message: 'Not admin' })
        }

        res.user = decoded
        // Set the decoded user data in the request object for further use
        next()


        // Call the next middleware or route handler

    })



}


module.exports = {
    verifyAccessToken,
    verifyAdmin
};