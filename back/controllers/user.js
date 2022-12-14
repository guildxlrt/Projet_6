// importer modele utilisateur
const User = require('../models/user');

//importer bcrypt
const bcrypt = require('bcrypt');
// importer json web token
const jwt = require('jsonwebtoken');
// importer password-validator
const pwVal = require("password-validator");

//------Methode pour creer un utilisateur
exports.signup = (req, res, next) => {
    (function reqValidation() {
        //--------Configuration des verificateurs
        // utilisation d'une regex pour l'email
        const emailValidator = new RegExp(/^([a-z0-9._-]+)@([a-z0-9]+)\.([a-z]{2,8})(\.[a-z]{2,8})?$/, 'g');
        
        // utilisation de password-validator
        const pwValSchema = new pwVal();
        // configuration
        pwValSchema
        .is().min(8)                                    // Minimum length 8
        .is().max(100)                                  // Maximum length 100
        .has().uppercase(2)                              // Must have uppercase letters
        .has().lowercase(2)                              // Must have lowercase letters
        .has().digits(2)                                // Must have at least 2 digits
        .has().not().spaces()                           // Should not have spaces
        .is().not().oneOf(['Passw0rd', 'Password123']); // Blacklist these values

        //--------Verification : Requete Valide
        if ((emailValidator.test(req.body.email)) && (pwValSchema.validate(req.body.password))) {
            //---hasher le mdp avec bcrypt
            bcrypt.hash(req.body.password, 10)
            .then(hash => {
                // on met le hash et l'email dans l'objet utilisateur
                const user = new User({
                    email : req.body.email,
                    password : hash
                });
                // on sauve la reponse dans la base de donnee
                user.save()
                // message de confirmation
                .then(() => res.status(201).json({ message : 'utilisateur cree !' }))
                // message d'erreurs : l'email n'est pas unique
                .catch((error) => {
                    console.log(error.message.split('User validation failed: email: ')[1]);
                    res.status(400).json({ message : error.message.split('User validation failed: email: ')[1] }) });
            })
            .catch(error => res.status(500).json({error}));
        }
        
        //--------Verification : Requete Non Valide
        // Email
        else if ((emailValidator.test(req.body.email)) === false && (pwValSchema.validate(req.body.password)) === true) {
            // message d'erreur
            return res.status(400).json({ message : "l'email doit etre au format email : jack.nicholson@laposte.fr, sasha93.dupont@yahoo.fr, kanap-service_client@kanap.co.fr ..." })
        }
        // Mot De Passe
        else if ((emailValidator.test(req.body.email)) === true && (pwValSchema.validate(req.body.password)) === false) {
            // message d'erreur
            return res.status(400).json({ message : "le mot de passe n'est pas assez fort : il doit contenir au minimum 2 chiffres, 2 minuscules et 2 majuscules; il doit etre d'une longueur minimum de 8 caracteres" })
        }
        // les deux sont invalides 
        else if ((emailValidator.test(req.body.email)) === false && (pwValSchema.validate(req.body.password)) === false) {
            // message d'erreur
            return res.status(400).json({ message : "informations incorrectes" })
        }
    })();
};

//------methode pour ajouter un utilisateur
exports.login = (req, res, next) => {
    User.findOne({ email : req.body.email})
    .then(user => {
        // mauvais utilisateur
        if (!user) {
            // le message d'erreur est volontairement flou (fuite d'erreur)
            return res.status(401).json({ message : 'Paire login/mot de passe incorrecte' });
        }
        // bon utilisateur
        bcrypt.compare(req.body.password, user.password)
        .then(valid => {
            if (!valid) {
                res.status(401).json({ message : 'Paire login/mot de passe incorrecte' });
            };
            res.status(200).json({
                userId : user._id,
                token : jwt.sign(
                    {userId : user._id},
                    process.env.RANDOM_TOKEN,
                    { expiresIn : '24h'}
                )
            });
        })
        .catch(error => res.status(500).json({error}));
    })
    .catch(error => res.status(500).json({error}));
};