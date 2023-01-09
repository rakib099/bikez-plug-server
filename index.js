const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: "Unauthorized Access" });
    }

    const token = authHeader.split(' ')[1]

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: "Forbidden Access" });
        }

        req.decoded = decoded;
        next();
    });

}

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i9w8jvi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const userCollection = client.db('BikezPlug').collection('users');
        const categoryTitleCollection = client.db('BikezPlug').collection('categoryTitles');
        const bikeCollection = client.db('BikezPlug').collection('bikes');
        const bookingCollection = client.db('BikezPlug').collection('bookings');

        // creating jwt token
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email };
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d' });
                return res.send({ accessToken: token });
            }
            res.status(403).send({ accessToken: '' });
        });

        // USERS API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email }
            const usr = await userCollection.findOne(query);
            if (usr) {
                return res.status(403).send({ message: 'User already exists' });
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        // Get Only Sellers
        app.get('/users/sellers', verifyJWT, async (req, res) => {
            const query = {
                userType: "Seller"
            }
            const cursor = userCollection.find(query);
            const sellers = await cursor.toArray();
            res.send(sellers);
        });

        // Get Only Buyers
        app.get('/users/buyers', verifyJWT, async (req, res) => {
            const query = {
                userType: "Buyer"
            }
            const cursor = userCollection.find(query);
            const buyers = await cursor.toArray();
            res.send(buyers);
        });

        app.get('/category-titles/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const title = await categoryTitleCollection.findOne(query);
            res.send(title);
        });

        // Bikes API
        app.get('/bikes/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = { categoryId: id };
            const cursor = bikeCollection.find(query);
            const bikes = await cursor.toArray();
            res.send(bikes);
        });

        // Report an item
        app.patch('/bikes/reported/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const updatedDoc = {
                $set: {
                    reported: true
                }
            }
            const result = await bikeCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Get Reported items
        app.get('/reported', verifyJWT, async (req, res) => {
            const query = {
                reported: true
            }
            const cursor = bikeCollection.find(query);
            const reportedItems = await cursor.toArray();
            res.send(reportedItems);
        });

        // Booking API
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decoded = req.decoded;
            if (decoded.email !== email) {
                return res.status(403).send({message: "Forbidden Access"});
            }
            // console.log('You are valid user! Access Granted');
            let query = {}
            if (email) {
                query = {
                    email: email
                }
            }
            const bookings = await bookingCollection.find(query).toArray();
            res.send(bookings);
        });

        app.post('/bookings', verifyJWT, async (req, res) => {
            const booking = req.body;
            /* ------------- Checking If Already Booked ---------------- */
            const query = {
                email: booking.email,
                bikeId: booking.bikeId
            }
            const cursor = bookingCollection.find(query);
            const alreadyBooked = await cursor.toArray();
            if (alreadyBooked.length) {
                return res.status(403).send({ message: "This item is already booked by you!" });
            }
            /* --------------------------------------------------------- */
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
        });

        // Make a Seller Verified
        app.patch('/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const updatedDoc = {
                $set: {
                    verified: true
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc);
            res.send(result);
        });

        // Seller Delete
        app.delete('/sellers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        // Buyer Delete
        app.delete('/buyers/:id', verifyJWT, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await userCollection.deleteOne(query);
            res.send(result);
        });

        // useBuyer hook API
        app.get('/buyer', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await userCollection.findOne(query);
            res.send({ isBuyer: user?.userType === "Buyer" });
        });

        // useAdmin hook API
        app.get('/admin', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await userCollection.findOne(query);
            res.send({isAdmin: user?.userType === "Admin"});
        });

        // useVerification hook API
        app.get('/verify', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const query = {
                email: email
            }
            const user = await userCollection.findOne(query);
            res.send({isSellerVerified: user?.verified === true});
        });
    }
    finally {

    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Bikez Plug Server running');
});

app.listen(port, () => {
    console.log(`Bikez Plug running on port ${port}`);
});