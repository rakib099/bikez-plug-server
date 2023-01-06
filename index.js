const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion } = require('mongodb');
require('dotenv').config();

const app = express();
const port = process.env.PORT || 5000;

// middle wares
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.i9w8jvi.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {
    try {
        const userCollection = client.db('BikezPlug').collection('users');

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