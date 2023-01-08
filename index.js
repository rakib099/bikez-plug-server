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

const verifyJWT = () => {
    
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
            const query = {email: email};
            const user = await userCollection.findOne(query);
            if (user) {
                const token = jwt.sign({email}, process.env.ACCESS_TOKEN_SECRET, {expiresIn: '1d'});
                return res.send({accessToken: token});
            }
            res.status(403).send({accessToken: ''});
        });

        // USERS API
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = {email: user.email}
            const usr = await userCollection.findOne(query);
            if (usr) {
                return res.status(403).send({message: 'User already exists'});
            }
            const result = await userCollection.insertOne(user);
            res.send(result);
        });

        app.get('/category-titles/:id', async (req, res) => {
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const title = await categoryTitleCollection.findOne(query);
            res.send(title);
        });

        // Bikes API
        app.get('/bikes/category/:id', async (req, res) => {
            const id = req.params.id;
            const query = {categoryId: id};
            const cursor = bikeCollection.find(query);
            const bikes = await cursor.toArray();
            res.send(bikes);
        });

        // Booking API
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result);
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