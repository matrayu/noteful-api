const express = require('express');
const logger = require('../logger');
const FoldersService = require('./folders-service');
const xss = require('xss');
const path = require('path'); //Node's internal module - access Posix

const foldersRouter = express.Router();
const jsonParser = express.json();

const sterileFolder = folder => ({
    id: folder.id,
    foldername: xss(folder.foldername),
    date_created: folder.date_created
})

foldersRouter
    .route('/')
    .get((req, res, next) => {
        const knexInstance = req.app.get('db');
        FoldersService.getAllfolders(knexInstance)
            .then(folder => {
                res.json(folder.map(sterileFolder))
            })
            .catch(next)
    })
    .post(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db');
        const { foldername } = req.body;
        const newFolder = { foldername };

        if (!foldername) {
            logger.error(`Missing foldername value must be provided`)
            return res
                .status(400)
                .send({ 
                    error: `Missing foldername value must be provided`
                })
        }

        FoldersService.insertNote(knexInstance, newFolder)
            .then(folder => {
                logger.info(`Folder with id ${folder.id} created`)
                res
                    .status(201)
                    .location(path.posix.join(req.originalUrl, `/${folder.id}`))
                    .json(sterileFolder(folder))
            })
            .catch(next)
    })

foldersRouter
    .route('/:folder_id')
    .all((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { folder_id } = req.params;

        FoldersService.getById(knexInstance, folder_id)
            .then(folder => {
                if(!folder) {
                    logger.error(`Folder with id ${folder_id} not found`)
                    return res
                        .status(404)
                        .json({ 
                            error: `Folder with id ${folder_id} not found`
                        })
                }
                res.folder = folder
                next()
            })
            .catch(next)
    })
    .get((req, res, next) => {
        res.json(sterileFolder(res.folder))
    })
    .delete((req, res, next) => {
        const knexInstance = req.app.get('db');
        const { folder_id } = req.params;

        FoldersService.deleteFolder(knexInstance, folder_id)
            .then(() => {
                res
                    .status(204)
                    .end()
            })
            .catch(next)
    })
    .patch(jsonParser, (req, res, next) => {
        const knexInstance = req.app.get('db')
        const { folder_id } = req.params;
        const { foldername } = req.body;
        const folderToPatch = { foldername }

        if (folderToPatch == null) {
            logger.error(`Request body must contain a folder name`)
            return res
                .status(400)
                .json({ 
                    error: `Request body must contain a folder name`
                })
        }

        FoldersService.updateFolder(knexInstance, folder_id, folderToPatch)
            .then(() => {
                res
                    .status(204)
                    .end()
            })
            .catch(next)
    })

    module.exports = foldersRouter;