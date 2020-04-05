var express = require('express');
var ejs = require('ejs');
var http = require('http');
var bodyParser = require('body-parser');
var url = require('url');

var app = express();

app.use(bodyParser.urlencoded({
    extended: true
  }));
app.use(bodyParser.json());

app.use( express.static( "public" ) );
app.set('view engine', 'ejs');

// Redirection vers la page "d'accueil"
app.get('/', (req, res) => {
    res.redirect('/taches');
});

// Vue pour créer une tâche
app.get('/tache/ajout', (req, res) => {
    res.render('pages/ajouterElement.ejs', {msg: ""});
});

// Visualisation de toutes les tâches
app.get('/taches', (req, res) => {
    var listeTache = [];

    // Vérification de la présence d'un filtre
    var queryT;
    if(req.query !== undefined) {
        queryT = url.parse(req.url, true).query;
        if(queryT.tags == '') {
            queryT.tags = undefined;
        }
    }

    http.get('http://localhost:8080/taches', (resp) =>{
        var data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            listeTache = JSON.parse(data);
            var echeance = queryT.echeance;
            var statuts = queryT.statut;
            var tags = queryT.tags;

            if(queryT.statut != null || queryT.tags != null || queryT.echeance != null) {
                listeTache.forEach(function(elt, index, object) {
                    var filtre = [];
        
                    if(queryT.statut !== undefined && !queryT.statut.includes(elt.statut)) {
                        filtre.push(false);
                    }
                    if(queryT.tags !== undefined && !queryT.tags.includes(elt.tags)) {
                        filtre.push(false);
                    }
        
                    // Gestion date
                    var date = new Date().getTime();
                    var dateTache = new Date(elt.dateFin).getTime();
        
                    if(queryT.echeance !==undefined && dateTache < date) {
                        filtre.push(true);
                    }
                    if(filtre.includes(false)){
                        elt.filtre = false;
                    } else {
                        elt.filtre = true;
                    }
                });
                listeTache.forEach(elt => {
                    elt.statut = gestionStatut(elt.statut);
                });
                listeTache = listeTache.filter(item => (item.filtre == true) );
            } else {
                listeTache.forEach(elt => {
                    elt.statut = gestionStatut(elt.statut);
                });
            }

            console.log(statuts +" : "+ tags +" : "+ echeance);
            res.render('pages/index.ejs', {liste: listeTache, filtreStatut: statuts, filtreEcheance: echeance, filtreTags: tags}); 
        });
    });
});

// Visualisation d'une tâche (id en paramètre)
app.get('/tache/:id', (req, res) => {
    var fluxJSON = '';
    var tacheARecup = '';
    var paraId = req.params.id;
    http.get('http://localhost:8080/tache/'+paraId, (resp) =>{
        var data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            fluxJSON = data;
            tacheARecup = JSON.parse(data);
            res.render('pages/afficherElement', {tache: tacheARecup ,tacheJSON: data, msg: ""});
        });
    });
});

// Suppression d'une tache (id en paramètre)
app.get('/tachesupp/:id', (req, res) => {
    var paraId = req.params.id;

    var options = {
        hostname: 'localhost',
        port: 8080,
        path: '/tache/'+paraId,
        method: 'DELETE'
    };

    const reqDelete = http.request(options, (resp) => {
        var data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            res.redirect('/taches');
        });
    });
    reqDelete.end();
});

// Création d'une tâche en envoyant un flux json
app.post('/taskcreat/', (req, res) => {
    var tache = '';
    if(req.body.tache !== undefined) {
        tache = JSON.stringify(JSON.parse(req.body.tache));
    } else {
        var txt = new Object();
        txt.titre = req.body.titre;
        txt.dateDebut = req.body.dateDebut;
        txt.dateFin = req.body.dateFin;
        txt.statut = req.body.statut;
        txt.tags = req.body.tags;

        tache = JSON.stringify(txt);
    }

    var options = {
        hostname: 'localhost',
        port: 8080,
        path: '/tache',
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': tache.length
        }
    };

    const reqPost = http.request(options, (resp) => {
        var data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            if(resp.statusCode == 201) {
                res.redirect('/taches');
            } else {
                res.render('pages/ajouterElement', {msg: data});
            }
        });
    });
    reqPost.write(tache);
    reqPost.end();
});

// Modification d'une tâche en envoyant un flux json
app.post('/taskmod/', (req, res) => {
    var tache = '';
    var txt = new Object();
    var id = '';
    if(req.body.tache !== undefined) {
        var tmp = JSON.parse(req.body.tache)
        tache = JSON.stringify(tmp);
        id = tmp.id;
    } else {
        txt.id = "";
        txt.titre = req.body.titre;
        txt.dateDebut = req.body.dateDebut;
        txt.dateFin = req.body.dateFin;
        txt.statut = req.body.statut;
        txt.tags = req.body.tags;

        tache = JSON.stringify(txt);
        id = req.body.id;
    }

    var options = {
        hostname: 'localhost',
        port: 8080,
        path: '/tache/'+id,
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Content-Length': tache.length
        }
    };

    const reqPUT = http.request(options, (resp) => {
        var data = '';

        resp.on('data', (chunk) => {
            data += chunk;
        });

        resp.on('end', () => {
            if(resp.statusCode == 201) {
                res.redirect('/taches');
            } else {
                txt.id = id;
                console.log(txt);
                res.render('pages/afficherElement', {tache: txt ,tacheJSON: JSON.stringify(txt, null, '\t'), msg: data});
            }
        });
    });

    reqPUT.write(tache);
    reqPUT.end();
});

app.listen(8081);

// Fonction gestion statut
function gestionStatut(statut) {
    let stat = '';
    switch(statut) {
        case 'Non_precise':
            stat = 'Non précisé';
            break;
        case 'Une_tache_est_requise':
            stat = 'Une tâche est requise';
            break;
        case 'En_cours':
            stat = 'En cours';
            break;
        case 'Achevee':
            stat = 'Achevée';
            break;
        case 'Annule':
            stat = 'Annulé';
            break;
        default:
            stat = statut;
    }
    return stat;
}