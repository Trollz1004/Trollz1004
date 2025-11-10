import 'dotenv/config';
import * as admin from 'firebase-admin';

admin.initializeApp({
  credential: admin.credential.cert(JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string)),
});

const db = admin.firestore();

const products = [
  {
    id: 'prod_1',
    name: 'Date App Premium',
    price: 1000, // in cents
    description: 'Unlock premium features for a better dating experience.',
  },
  {
    id: 'prod_2',
    name: 'Date App Super Like',
    price: 200, // in cents
    description: 'Get a pack of 5 Super Likes to stand out.',
  },
  {
    id: 'prod_3',
    name: 'Date App Profile Boost',
    price: 500, // in cents
    description: 'Boost your profile to be seen by more people.',
  },
];

const seedDatabase = async () => {
  const productsCollection = db.collection('products');
  for (const product of products) {
    await productsCollection.doc(product.id).set(product);
  }
  console.log('Database seeded successfully');
};

seedDatabase().catch((error) => {
  console.error('Error seeding database:', error);
});
