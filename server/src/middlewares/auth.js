const admin = require('firebase-admin');
const { createPrivateKey } = require('node:crypto');

// Dashboard values may include JSON quotes or escaped line breaks.
let privateKey = (process.env.FIREBASE_PRIVATE_KEY || '').trim();
if ((privateKey.startsWith('"') && privateKey.endsWith('"')) ||
    (privateKey.startsWith("'") && privateKey.endsWith("'"))) {
  privateKey = privateKey.slice(1, -1);
}
privateKey = privateKey.replace(/\\r\\n/g, '\n').replace(/\\n/g, '\n').replace(/\r\n/g, '\n').trim();
try {
  createPrivateKey(privateKey);
} catch {
  throw new Error('FIREBASE_PRIVATE_KEY is invalid. In your hosting environment, paste only the complete private_key value from the Firebase service-account JSON, including BEGIN PRIVATE KEY and END PRIVATE KEY. Do not paste the whole JSON, the variable name, or a truncated key.');
}

const serviceAccount = {
  type: process.env.FIREBASE_TYPE,
  project_id: process.env.FIREBASE_PROJECT_ID,
  private_key_id: process.env.FIREBASE_PRIVATE_KEY_ID,
  private_key: privateKey,
  client_email: process.env.FIREBASE_CLIENT_EMAIL,
  client_id: process.env.FIREBASE_CLIENT_ID,
  auth_uri: process.env.FIREBASE_AUTH_URI,
  token_uri: process.env.FIREBASE_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.FIREBASE_AUTH_PROVIDER,
  client_x509_cert_url: process.env.FIREBASE_CLIENT_CERT,
  universe_domain: process.env.FIREBASE_UNIVERSE_DOMAIN,
};

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const authMiddleware = async (req, res, next) => {
  const authorization = req.headers.authorization || '';
  const idToken = authorization.replace(/^Bearer\s+/i, '').trim();

  if (!idToken) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(idToken);
    req.user = decodedToken;
    next();
  } catch (err) {
    console.error(err.message);
    res.status(401).json({ message: 'Unauthorized', error: err.message });
  }
};

module.exports = authMiddleware;
