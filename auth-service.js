const mongoose = require('mongoose');
const uniqueValidator = require('mongoose-unique-validator');

// User Schema
const userSchema = mongoose.Schema({
    userName: {
        type: String,
        require: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true
    },
    loginHistory: [{
        dateTime: Date,
        userAgent: String
    }]
});

//validator for unique id
userSchema.plugin(uniqueValidator);

const dbURI = "mongodb+srv://root:Password@cluster0.2aa73uk.mongodb.net/?retryWrites=true&w=majority"
let User;
module.exports.initialize = function () {
    return new Promise(function (resolve, reject) {
        let db = mongoose.createConnection(dbURI, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        db.on('error', (err) => {
            reject(err); // reject the promise with the provided error
        });
        db.once('open', () => {
            User = db.model("users", userSchema);
            resolve();
        });
    });
};
module.exports.User = User;

// Function to add a new user
module.exports.addUser = async (userName, hashedPassword, email) => {
    try {
        const newUser = new User({
            userName,
            password: hashedPassword,
            email
        });

        await newUser.save();
    } catch (error) {
        throw error;
    }
};

module.exports.findUser =  async (userName) => {
    try {
        const user = await User.findOne({ userName }); // Use the findOne method to find a 
        return user; // Return the user if found, or null if not found
    } catch (error) {
        throw error; // If there's an error, rethrow it to handle it in the calling function
    }
};

// Function to find a old user
module.exports.findUserByUserName = async (userName, userAgent) => {
    try {
        const user = await User.findOne({ userName }); // Use the findOne method to find a user by their username
        // Update the user's login history
        const loginInfo = {
            dateTime: new Date(),
            userAgent: userAgent,
        };
        user.loginHistory.push(loginInfo);
        // Save the updated user document
        await user.save();

        return user; // Return the user if found, or null if not found
    } catch (error) {
        throw error; // If there's an error, rethrow it to handle it in the calling function
    }
};