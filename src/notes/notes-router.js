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
    folder_id: note.folder_id,
    date_created: note.date_created,
    date_modified: note.date_modified
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
        const { title, content, folder_id } = req.body;
        const requiredFields = { title, folder_id };
        const newNote = { title, content, folder_id };

        for (const [key, value] of Object.entries(requiredFields)) {
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
                    .json(sterileNote(note))
            })
            .catch(next)
    })

notesRouter
    .route('/:note_id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { note_id } = req.params;

        NotesService.getById(knexInstance, note_id)

            .then(note => {
                if (!note) {
                    logger.error(`Note with id ${note_id} not found`)
                    return res
                        .status(404)
                        .json({ error: `Note with id ${note_id} not found` })
                }
                res.note = note
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(sterileNote(res.note))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { note_id } = req.params;

        NotesService.deleteNote(knexInstance, note_id)
            .then(() => {
                res
                    .status(204)
                    .end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db');
        const { note_id } = req.params;
        const { title, content, folder_id } = req.body;
        const noteToPatch = { title, content, folder_id };
        
        const numOfValues = Object.values(noteToPatch).filter(Boolean).length
        
        if (numOfValues === 0) {
            logger.error(`Request body must contain either 'title', 'content' or 'folder_id'`)
            return res
                .status(400)
                .json({ 
                    error: `Request body must contain either 'title', 'content' or 'folder_id'` 
                })
        }

        NotesService.updateNote(knexInstance, note_id, noteToPatch)
            
            .then(() => {
                res
                    .status(204)
                    .end()
            })
            .catch(next)
    })


module.exports = notesRouter;