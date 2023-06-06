var express = require('express');
var router = express.Router();
const Brief = require('../models/briefs');
const BusinessType = require('../models/businessTypes');
const ProjectType = require('../models/projectTypes');
const StyleType = require('../models/styleTypes');
const Creation = require('../models/creations');
const User = require('../models/users');
const { checkBody } = require('../modules/checkBody.js');
const mongoose = require('mongoose');
const uniqid = require('uniqid');
const cloudinary = require('cloudinary').v2;
const fs = require('fs');
const { body, validationResult } = require('express-validator')
const sharp = require('sharp');

//Brief generator (from chosen options or random)

router.get('/generateBrief', async (req, res) => {
  try {
    
    const { businessTypeName, projectTypeName, styleTypeName } = req.query;

    // get businessType by name or random
    let businessType;
    if (businessTypeName) {
      businessType = await BusinessType.findOne({ name: businessTypeName });
    } else {
      const businessTypes = await BusinessType.find();
      businessType = businessTypes[Math.floor(Math.random() * businessTypes.length)];
    }

    // random businessEntry
    const businessEntry = businessType.businessEntries[Math.floor(Math.random() * businessType.businessEntries.length)];

    // get a random businessName, a random speciality and a random sentence
    const businessName = businessEntry.businessName[Math.floor(Math.random() * businessEntry.businessName.length)];
    const speciality = businessEntry.specialities[Math.floor(Math.random() * businessEntry.specialities.length)];
    const businessSentence = businessType.sentences[Math.floor(Math.random() * businessType.sentences.length)];

    // same logic as before 
    let projectType;
    if (projectTypeName) {
      projectType = await ProjectType.findOne({ name: projectTypeName });
      
    } else {
      const projectTypes = await ProjectType.find();
      projectType = projectTypes[Math.floor(Math.random() * projectTypes.length)];
    }
    const projectSentence = projectType.sentences[Math.floor(Math.random() * projectType.sentences.length)];

    // same logic
    let styleType;
    if (styleTypeName) {
      styleType = await StyleType.findOne({ name: styleTypeName });
    } else {
      const styleTypes = await StyleType.find();
      styleType = styleTypes[Math.floor(Math.random() * styleTypes.length)];
    }
    const styleSentence = styleType.sentences[Math.floor(Math.random() * styleType.sentences.length)];

    // generate the delay
    const delay = generateRandomDelay(projectType.min_delay, projectType.max_delay);

    // Return the individual data elements + sentences
    res.json({
      businessType: businessType.name,
      businessName,
      speciality,
      businessSentence,
      projectType,
      projectSentence,
      styleType,
      styleSentence,
      delay
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


  //post brief

  router.post('/', async (req, res) => {
    
   //look for user by token
    const token = req.headers.authorization;
    
    const user = await User.findOne({ token: token });

    if (!user) {
        return res.status(404).json({ message: "Utilisateur non trouvé" });
    }

    const brief = new Brief({
        entrepriseName: req.body.entrepriseName,
        entrepriseType: req.body.entrepriseType,
        entrepriseSentence: req.body.entrepriseSentence,
        projectType: req.body.projectType,
        projectSentence: req.body.projectSentence,
        styleType: req.body.styleType,
        styleSentence: req.body.styleSentence,
        delay: req.body.delay,
        speciality: req.body.speciality,
        color: req.body.color,
        user_id: [user._id], // use id to identify author 
    });

    try {
        const savedBrief = await brief.save();
        res.json(savedBrief);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// Get creation by ID

router.get('/creations/:id', async (req, res) => {
  try {
      let creation = await Creation.findById(req.params.id)
      .populate('brief_id')  // populate brief_id
      .populate('autor')  // populate autor
      .populate({
        path: 'commentaires.user_id',
        model: 'users',
      });

      creation = await User.populate(creation, {
        path: 'commentaires.user_id.profil_id',
        model: 'profils'
      });

      await creation.save();



      res.json(creation);
  
  } catch (err) {
      res.status(500).json({ message: err.message });
  }
});

//get creations with research params
router.get('/creationsWParams', async (req, res) => {

  let filter = {};
  let limit=false;

  if (req.query.projectType) {
      filter['projectType'] = req.query.projectType;
  }
  
  if (req.query.entrepriseType) {
      filter['entrepriseType'] = req.query.entrepriseType;
  }

  if (req.query.styleType) {
      filter['styleType'] = req.query.styleType;
  }
  if (req.query.limit) {
      limit = req.query.limit;
  }

  try {
   
      let briefs = "";
      if(limit) { briefs = await Brief.find(filter).select('_id').limit(limit) } // pour le caroussel accueil
      else { briefs = await Brief.find(filter).select('_id'); }
 
      const briefIds = briefs.map(brief => brief._id);

      const creations = await Creation.find({ brief_id: { $in: briefIds } })
        .sort({_id:-1})
        .populate( {path:'brief_id', options: { _id:-1 }})
        .populate('brief_id')
        .populate('autor')
        .exec();
 
      res.json({ result: true, creations: creations });
  } catch (err) {
      res.json({ result: false, error: err.message });
  }
});



// search user by username. Works with next road
router.get('/user/search/:username', async (req, res) => {
    try {
        const user = await User.findOne({ username: { $regex: req.params.username, $options: 'i' } });
        if (user) {
            res.json(user);

        } else {
            res.status(404).json({ message: 'Utilisateur non trouvé' });
        }
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});


// get Briefs by userid
router.get('/user/:userId/briefs', async (req, res) => {
  const reqUserId = req.params.userId;
  let userId = { user_id: reqUserId }; 
  try {
    if(reqUserId!=="") {
      //let creations = '';
      await Brief.find(userId).sort({date:-1}).populate( {path:'creations_id', options: { _id:-1 }}) // plus récente en premier
      .then( data => {
        if(data) {

          // lister les id créations de chaque brief
          res.json( { briefs: data, result:true } );
        }
        else {
          res.json( { result:false } );
        }
      })
    } else {
      res.status(500).json({ message: "UserId Incorrect" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});



//get creations caroussel
router.get('/caroussel', (req, res) => {


  try {
     // plus récente en premier et 4 seulement
    Creation.find({ images: { $ne: "" } , private:false }).sort({_id:-1}).limit(4)
    .populate('brief_id')
    .populate('autor')
    .then( data => {
      if(data) {
        // lister les id créations de chaque brief
        res.json( { creations: data, result:true } );
      }
      else {
        res.json( { result:false } );
      }
    })
  } catch (err) {
      res.json({ result: false, error: err.message });
  }
})

// get userCreation d'un by userId
router.get('/user/:userId/creations', async (req, res) => {

  
  let filter = {};

  if (req.query.projectType && req.query.projectType !== 'null') {
    filter['projectType'] = req.query.projectType;
  }
  
  if (req.query.entrepriseType && req.query.entrepriseType !== 'null') {
    filter['entrepriseType'] = req.query.entrepriseType;
  }

  if (req.query.styleType && req.query.styleType !== 'null') {
    filter['styleType'] = req.query.styleType;
  }


  try {

    const briefs = await Brief.find(filter).select('_id');

    const briefIds = briefs.map(brief => brief._id);


    const creations = await Creation.find({ 
      autor: new mongoose.Types.ObjectId(req.params.userId),
      brief_id: { $in: briefIds }
    })
    .sort({_id:-1})
    .populate( {path:'brief_id', options: { _id:-1 }})
    .populate('autor')
    .exec();


    if (creations && creations.length > 0) {
      res.json({ result: true, creations: creations });
    } else {
      res.json({ result: false, message: 'Créations non trouvées' });
    }
  } catch (err) {
    res.status(500).json({ result: false, error: err.message });
  }
});

//get a brief by ID

router.get('/:id', async (req, res) => {
    try {
        const brief = await Brief.findById(req.params.id);
        if (brief == null) {
            return res.status(404).json({ message: "Can't find brief" });
        }
        res.json(brief);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// POST creation to db

router.post('/creation', async (req, res) => {
  const ids = JSON.parse(req.body.ids);

  if (!checkBody(ids, ['brief_id', 'user_id'])) {
    return res.json({ result: false, error: 'Missing or empty fields' });
  } 
  
  const photoPath = `./tmp/${uniqid()}.jpg`; 
  const watermarkPath = './public/watermark-brief-creativ-logo.png';
  const outputImage = `./tmp/${uniqid()}_watermarked.jpg`;
  
  const resultMove = await req.files.photoFromFront.mv(photoPath);
  if (!resultMove) {
    // Apply watermark
    await sharp(photoPath)
      .composite([{ input: watermarkPath, gravity: 'southeast' }])
      .toFile(outputImage);

    const resultCloudinary = await cloudinary.uploader.upload(outputImage);

    try {
      
     // const dataExiste = await Creation.findOne({ brief_id: ids.brief_id, autor: ids.user_id });
     // si Idcreation edite sinon ajoute
     // const dataExiste = await Creation.findOne({ _id: ids.creation_id });
      const dataExiste = ids.creation_id

      if(dataExiste !== "") { // si Id creation ajoute img
          const data = await Creation.updateOne(
                        { _id: dataExiste },
                        { $push: { images: resultCloudinary.secure_url }});
          fs.unlinkSync(photoPath);
          fs.unlinkSync(outputImage);
          res.json({ result: true, creation: data });
      } else {
        const newCreation = new Creation({
          images: resultCloudinary.secure_url,
          brief_id: ids.brief_id,
          description_autor: ids.description_autor ||'',
          autor: ids.user_id,
          like: [],
          commentaires: [],
          signalement: [],
          visible: true,
          private: ids.private || false,
        });

        const newDoc = await newCreation.save();
        await Brief.updateOne({ _id: ids.brief_id }, { $push: { creations_id: newDoc._id } });
        fs.unlinkSync(photoPath);
        fs.unlinkSync(outputImage);
        res.json({ result: true, creation: newDoc });

      }
    } catch (e) {
      console.error(e);
      res.json({ result: false, error: e.message });
    }
  } else {
    res.json({ result: false, error: resultMove });
  }
});

//UPDATE creation (pic and desc)

router.put('/creations/:id', async (req, res) => {
  //Token check. Auth is needed.
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  //search creation by ID

  const creation = await Creation.findOne({ _id: req.params.id });
  if (!creation) {
    return res.status(404).json({ message: 'Création non trouvée' });
  }

  //check if user is author

  if (!creation.user_id.equals(user._id)) {
    return res.status(403).json({ message: 'Accès refusé' });
  }

  // modification of the desc and image of the creation
  if (req.body.description_autor !== undefined) {
    creation.description_autor = req.body.description_autor;
  }
  if (req.body.images !== undefined) {
    creation.images = req.body.images;
  }

  try {
    await creation.save();
    res.json({ message: 'Création mise à jour avec succès' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//handle likes on creations.

router.patch('/creationsLikes/:id/like', async (req, res) => {

  // token verification
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }


  // search creation by ID
  const creation = await Creation.findOne({ _id: req.params.id });
  if (!creation) {
    return res.status(404).json({ message: 'Création non trouvée' });
  }


  //add or remove user from like list 
  const userId = user._id.toString();
  const index = creation.like.indexOf(userId);
  if (index === -1) {
    creation.like.push(userId);
  } else {
    creation.like.splice(index, 1);
  }


  try {
    await creation.save();
    res.json({ message: 'Création mise à jour avec succès', likes: creation.like });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

//Post a creation's comment to db

router.post('/creations/:id/comment',  [
  body('message').isString().notEmpty().withMessage('Le message ne peut pas être vide'),
],
 async (req, res) => {

  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const creationId = req.params.id;
  const { message } = req.body;
  const userId = user._id;  // récupérer l'utilisateur
  try {
      const creation = await Creation.findById(creationId);

      if (!creation) {
          return res.status(404).json({ error: "Creation non trouvée" });
      }

      const commentaire = {
          date: new Date(),
          user_id: userId,
          message: message,
          like: [],
          visible: true
      };

      creation.commentaires.push(commentaire);

      await creation.save();

      // Populate user_id et profil_id du commentaire ajouté
      let addedComment = await Creation.findById(creationId)
        .populate({
          path: `commentaires.user_id`,
          model: 'users',
        });

      addedComment = await User.populate(addedComment, {
          path: `commentaires.user_id.profil_id`,
          model: 'profils',
      });

      if (!addedComment) {
        return res.status(404).json({ error: "Commentaire ajouté non trouvé après population" });
      }

      res.status(200).json({ comment: addedComment.commentaires[addedComment.commentaires.length - 1] });
      
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de l'ajout du commentaire" });
  }
});
//handle like on comments 

router.patch('/creations/:creationId/comment/:commentId/like', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }
  const { creationId, commentId } = req.params;
  const userId = user._id;  // récupérer l'utilisateur actuel

  try {
      const creation = await Creation.findById(creationId);

      if (!creation) {
          return res.status(404).json({ error: "Creation non trouvée" });
      }

      const commentaire = creation.commentaires.id(commentId);

      if (!commentaire) {
          return res.status(404).json({ error: "Commentaire non trouvé" });
      }

      const index = commentaire.like.indexOf(userId);

      if (index === -1) {
          commentaire.like.push(userId);
      } else {
          commentaire.like.splice(index, 1);
      }

      

      await creation.save();
      // Trouver l'index du commentaire mis à jour
      const updatedCommentIndex = creation.commentaires.findIndex(comment => comment.id === commentId);

      if (updatedCommentIndex === -1) {
        return res.status(404).json({ error: "Commentaire mis à jour non trouvé" });
      }

      // Populate user_id et profil_id du commentaire mis à jour
      const updatedComment = await Creation.findById(creationId)
        .populate({
          path: `commentaires.${updatedCommentIndex}.user_id`,
          model: 'users',
          populate: {
            path: 'profil_id',
            model: 'profils',
          },
        });

      if (!updatedComment) {
        return res.status(404).json({ error: "Commentaire mis à jour non trouvé après population" });
      }

      res.status(200).json({ comment: updatedComment.commentaires[updatedCommentIndex] });
  } catch (err) {
      console.error(err);
      res.status(500).json({ error: "Erreur lors de la mise à jour du like du commentaire" });
  }
});
//handle delete on comments : 
router.delete('/creations/:creationId/comment/:commentId', async (req, res) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  const { creationId, commentId } = req.params;

  try {
    const creation = await Creation.findById(creationId);

    if (!creation) {
        return res.status(404).json({ error: "Creation non trouvée" });
    }

    const commentIndex = creation.commentaires.findIndex(commentaire => commentaire._id.toString() === commentId);

    if (commentIndex === -1) {
        return res.status(404).json({ error: "Commentaire non trouvé" });
    }

    if (creation.commentaires[commentIndex].user_id.toString() !== user._id.toString()) {
        return res.status(403).json({ error: "Vous n'avez pas le droit de supprimer ce commentaire" });
    }

    creation.commentaires.splice(commentIndex, 1);

    await creation.save();

    res.status(200).json({ message: 'Commentaire supprimé avec succès' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erreur lors de la suppression du commentaire" });
  }
});

// supp img creation
router.delete('/creations/suppimg', async (req, res) => {

  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ message: 'Token manquant' });
  }

  const user = await User.findOne({ token: token });
  if (!user) {
    return res.status(401).json({ message: 'Token invalide' });
  }

  const { creationId, imgLink } = req.body;
 
  // supp img

  Creation.findById(creationId)
  .then( crea => {
    Creation.updateOne({ _id: crea._id  }, { $pull: { images: { $gte: imgLink } }}) // supp cette img link
    .then(resultat => {

      if(resultat.modifiedCount > 0) {

        if(crea.images.length === 1) { // si 1 img avant de supp // supp la creation
          
            Creation.deleteOne( { _id: creationId  } )
            .then(

              res.json({ result: true})
            )
        } else {

          if(resultat.modifiedCount > 0) {
            res.json({ result: true})
          } else {
            res.json({ result: false})
          }
        }

      } else {
        res.json({ result: false})
      }
      
    } )
  })
})

//make creation private or not.
router.patch('/creations/:id', async (req, res) => {
  const { id } = req.params;
  const { private } = req.body;  // On suppose que l'état 'private' est envoyé dans le corps de la requête.

  try {
      const creation = await Creation.findById(id);
      if (!creation) {
          return res.status(404).json({ message: "Création non trouvée." });
      }

      creation.private = private;  // Mettez à jour l'état 'private'
      await creation.save();

      return res.status(200).json(creation);
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erreur du serveur." });
  }
});

module.exports = router;


// function to generate a random delay (30 min span)
function generateRandomDelay(minDelay, maxDelay) {
    const min = Math.ceil(minDelay);
    const max = Math.floor(maxDelay);
    return (Math.floor(Math.random() * (max - min + 1)) + min) * 0.5;
  }