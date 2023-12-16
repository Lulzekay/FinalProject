"use strict";
// requires statements
const express = require("express");
const app = express();
const path = require("path");
const bodyParser = require("body-parser");
require("dotenv").config({ path: path.resolve(__dirname, 'credentials/.env') })

const uri = process.env.MONGO_CONNECTION_STRING;
const axios = require('axios');
/* Our database and collection */
const databaseAndCollection = { db: process.env.MONGO_DB_NAME, collection: process.env.MONGO_COLLECTION };
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(bodyParser.urlencoded({ extended: true }));

app.set("views", path.resolve(__dirname, "templates"));

app.set("view engine", "ejs");

// make sure port number is specified

const portNumber = process.env.PORT || 3000;

console.log(`Web server started and running at http://localhost:${portNumber}`);

//processing
app.get("/", (req,res) => {
    res.render("index");
});


app.post("/signUpProcessing", (req,res) => {
    (async () => {
		const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
		try {
			await client.connect();
			let name = req.body.name;
			let email = req.body.email;
			let password = req.body.password;
			let obj = {name: name, email: email, password: password};

            (async () => {
                const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
        
                try {
                    await client.connect();
                    let filter = {email:email};

                    const result = await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .findOne(filter);
        
                    if (result) {
						// if email is already in use then re render the page
                        res.render("index");
                    } else {
						const recaptchaResponse = req.body['g-recaptcha-response'];
    					const secretKey = "6LfDVTMpAAAAADKIVtgycSIVZYIO0KlZG713j6ky";

						const verifyURL = `https://www.google.com/recaptcha/api/siteverify?secret=${secretKey}&response=${recaptchaResponse}`;


						const recaptchaResult = await axios.post(verifyURL);
						if (!recaptchaResult.data.success) {
							// reCAPTCHA verification failed
							return res.render("index", { error: "reCAPTCHA verification failed" });
						}
			
						
						// render betting page if sign up was successful
						await client.db(databaseAndCollection.db)
                        .collection(databaseAndCollection.collection)
                        .insertOne(obj);
						let renderObj = {email:`<input id="email" type="text" name="email" value="${email}" readonly>`};
                        res.render("bettingForm", renderObj);
                    }
                } catch (e) {
                    console.error(e);
                } finally {
                    await client.close();
                }
            })();
		} catch (e) {
			console.error(e);
		} finally {
			await client.close();
		}
	})();
});

app.post("/loginProcessing", (req,res) => {
    (async () => {
		const client = new MongoClient(uri, { serverApi: ServerApiVersion.v1 });
		try {
			await client.connect();
			let email = req.body.loginEmail;
			let password = req.body.loginPassword;
			let filter = {email: email, password: password};

            const result = await client.db(databaseAndCollection.db)
            .collection(databaseAndCollection.collection)
            .findOne(filter);

            if (result) {
				// render betting page if email and password is found
                let obj = {email:`<input id="email" type="text" name="email" value="${email}" readonly>`};
                res.render("bettingForm", obj);
            } else {
                res.render("index");
            }
		} catch (e) {
			console.error(e);
		} finally {
			await client.close();
		}

	})();
});

app.get("/bettingProcessing", (req, res) => {
	let pickedTeam = `<span id="team1">${req.query.betGame}</span>`;
	let email = `<input id="email" type="text" name="email" readonly value="${req.query.email}">`;
	let balance = `<input id="balance" type="number" name="balance" readonly value="${req.query.balance}">`;
	let betAmount = `<span id="betAmount">${req.query.betAmount}</span>`;
	let team1Score = `<span id="team1Score">${Math.round(Math.random() * 50 + 80)}</span>`;
	let team2Score = `<span id="team2Score">${Math.round(Math.random() * 50 + 80)}</span>`;
	
	let team2 = "";
	if (req.query.betGame === "Pistons") {
		team2 = `<span id="team2">Hawks</span>`;
	} else if (req.query.betGame === "Hawks") {
		team2 = `<span id="team2">Pistons</span>`;
	} else if (req.query.betGame === "Warriors") {
		team2 = `<span id="team2">Cavs</span>`;
	} else {
		team2 = `<span id="team2">Warriors</span>`;
	}

	let obj = {email:email, balance:balance, betAmount:betAmount, team1:pickedTeam, team1Score:team1Score,
	team2:team2, team2Score:team2Score};

	res.render("bettingProcessing", obj);
});

app.listen(portNumber);

process.stdin.setEncoding("utf8");
process.stdout.write("Stop to shutdown the server: ");
process.stdin.on('readable', () => {
	let dataInput = process.stdin.read();
	if (dataInput !== null) {
		let command = dataInput.trim();
		if (command === "stop") {
			console.log("Shutting down the server");
			process.exit(0);
		} else {
			console.log(`Invalid command: ${command}`);
		}
	}
	process.stdout.write("Stop to shutdown the server: ");
	process.stdin.resume();
});