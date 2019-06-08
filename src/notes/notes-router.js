const express = require('express');
const logger = require('../logger');
const NotesService = require('./notes-service');
const xss = require('xss');
const path = require('path'); //Node's internal module - access Posix

const notesRouter = express.Router();
const jsonParser = express.json();

const sterileNote = note => ({
    id: note.id,
    title: xss(note.title),
    content: xss(note.content),
    folder_id: note.folder.id,
    date_created: note.date_created,
    date_modifed: note.date_modifed
});

notesRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db')
        NotesService.getAllNotes(knexInstance)
            .then(note => {
                res.json(note.map(sterileNote))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db');
        const { title, content } = req.body;
        const newNote = { title, content };

        for (const [key, value] of Object.entries(newNote)) {
            if (value == null) {
                logger.error(`${key} value is empty`)
                return res
                    .status(400)
                    .send({
                        error: `Missing ${key} in the request body`
                    })
            }
        }

        NotesService.insertNote(knexInstance, newNote)
            .then(note => {
                logger.info(`Note with id ${note.id} create`)
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${note.id}`))
                    ,json(sterileNote(note))
            })
            .catch(next)
    })


module.exports = notesRouter;