const { makeNotesArray } = require('./notes.fixtures');
const { makeFoldersArray, makeMaliciousFolder } = require('./folders.fixtures');
const knex = require('knex');
const app = require('../src/app');

describe(`Folders Endpoints`, function() {
    let db;

    before('make knex instance', () => {
        db =
         knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

    describe('GET /api/folders', () => {
        context('Given no folders', () => {
          it('responds with 200 and an empty list', () => {
            return supertest(app)
              .get('/api/folders')
              .expect(200, [])
          })
        })

        context('Given there are folders in the database', () => {
          const testNotes = makeNotesArray();
          const testFolders = makeFoldersArray();

          beforeEach('insert notes', () => {
            return db
              .into('noteful_folders')
              .insert(testFolders)
              .then(() => {
                return db
                  .into('noteful_notes')
                  .insert(testNotes)
              })
          })

          it('responds with 200 and all the folders', () => {
            return supertest(app)
              .get('/api/folders')
              .expect(200, testFolders)
          })
        })

        context('Given an XSS attack folder', () => {
          const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
          const testFolders = makeFoldersArray();

          beforeEach('insert malicious folder', () => {
            return db
              .into('noteful_folders')
              .insert(maliciousFolder)
          })

          it('responds with 200 and removes XSS attack content', () => {
            return supertest(app)
              .get('/api/folders')
              .expect(200)
              .expect(res => {
                expect(res.body[0].foldername).to.eql(expectedFolder.foldername)
              })
          })
        })
    })

    describe('GET /api/folders/:folders_id', () => {
        context('Given folder id cannot be found', () => {
          it('responds with a 404 and error', () => {
            const folderId = 999;
            return supertest(app)
              .get(`/api/folders/${folderId}`)
              .expect(404, {
                error: `Folder with id ${folderId} not found`
              })
          })
        })
  
        context('Given note id can be found', () => {
          const testNotes = makeNotesArray();
          const testFolders = makeFoldersArray();
  
          beforeEach('insert notes', () => {
            return db
              .into('noteful_folders')
              .insert(testFolders)
              .then(() => {
                return db
                  .into('noteful_notes')
                  .insert(testNotes)
              })
          })
  
          it('responds with 200 and the specified note', () => {
            const folderId = 2
            const expectedFolder = testFolders[folderId - 1]
            return supertest(app)
              .get(`/api/folders/${folderId}`)
              .expect(200, expectedFolder)
          })
        })
    })

    describe('POST /api/folders', () => {
        it('responds with a 201 and creates and new folder', () => {
          this.retries(3);
          
          const newFolder = {
            foldername: 'new title'
          };
  
          return supertest(app)
            .post('/api/folders')
            .send(newFolder)
            .expect(201)
            .expect(res => {
              expect(res.body.foldername).to.eql(newFolder.foldername)
              expect(res.body).to.have.property('id')
              expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`)
              const expected = new Date().toLocaleString
              const actualCreated = new Date(res.body.date_created).toLocaleString
              expect(actualCreated).to.eql(expected)
            })
            //implicit return so it waits for the response data
            .then(postRes =>
              supertest(app)
                .get(`/api/folders/${postRes.body.id}`)
                .expect(postRes.body)
            )
        })
  
        it(`responds with 400 and an error when foldername is missing`, () => {
        const missingFolder = {}

        return supertest(app)
            .post('/api/folders')
            .send(missingFolder)
            .expect(400, {
            error: `Missing foldername value must be provided`
            })
        })

        context('Given an XSS attack folder', () => {
          const { maliciousFolder, expectedFolder } = makeMaliciousFolder();
          //const testFolders = makeFoldersArray();
  
          beforeEach('insert malicious folder', () => {
            return db
              .into('noteful_folders')
              .insert([ maliciousFolder ])
          })
  
          it('responds with a 201 and removes the XSS attack content', () => {
            return supertest(app)
              .post(`/api/folders`)
              .send(maliciousFolder)
              .expect(201)
              .expect(res => {
                expect(res.body.title).to.eql(expectedFolder.title)
              })
          })
        })
    })

    describe('DELETE /api/folders', () => {
        context('Given no folders', () => {
          it(`responds with a 404 and an error`, () => {
            const folderId = 999;
            return supertest(app)
              .delete(`/api/folders/${folderId}`)
              .expect(404, {
                error: `Folder with id ${folderId} not found`
              })
          })
        })
  
        context(`Given the folder ID is in the database`, () => {
          const testNotes = makeNotesArray();
          const testFolders = makeFoldersArray();
  
          beforeEach('insert notes', () => {
            return db
              .into('noteful_folders')
              .insert(testFolders)
              .then(() => {
                return db
                  .into('noteful_notes')
                  .insert(testNotes)
              })
          })
  
          it(`responds with a 204 and removes the folder`, () => {
            const folderToRemove = 2;
            const expectedFolders = testFolders.filter(folder => folder.id != folderToRemove)
            return supertest(app)
              .delete(`/api/folders/${folderToRemove}`)
              .expect(204)
                .then(res => 
                  supertest(app)
                    .get(`/api/folders`)
                    .expect(expectedFolders)
                )
          })
        })
    })

    describe('PATCH /api/notes', () => {
        context('Given no folder ID found to patch', () => {
          it('responds with a 404 and error', () => {
            const folderId = 999
            return supertest(app)
              .patch(`/api/folders/${folderId}`)
              .expect(404, {
                error: `Folder with id ${folderId} not found`
              })
          })
        })
  
        context('Given there is a folder found to patch', () => {
          const testFolders = makeFoldersArray();
          const testNotes = makeNotesArray();
  
          beforeEach('insert notes', () => {
            return db
              .into('noteful_folders')
              .insert(testFolders)
              .then(() => {
                return db
                  .into('noteful_notes')
                  .insert(testNotes)
              })
          })
  
          it(`responds with a 204 and updates the folder`, () => {
            const idToPatch = 2;
  
            const patchedFolder = {
              foldername: 'this is updated!'
            };
  
            const expectedFolder = {
              ...testFolders[idToPatch - 1],
              ...patchedFolder
            }
  
            return supertest(app)
              .patch(`/api/folders/${idToPatch}`)
              .send(patchedFolder)
              .expect(204)
              .then(res => 
                supertest(app)
                  .get(`/api/folders/${idToPatch}`)
                  .expect(expectedFolder)
              )
          })
        })

        context('Given an XSS attack folder', () => {
            const testFolder = {
                id: 2,
                foldername: 'Test Folder Title',
                date_created: '1919-12-22T16:28:32.615Z'
            }
  
            beforeEach('insert folders', () => {
              return db
                .into('noteful_folders')
                .insert(testFolder)
            })
  
            it('responds with 204 and removes XSS attack content', () => {
                const maliciousFolderPatch = {
                    foldername: 'XSS Attack <script>alert("xss");</script>'
                }

                const expectedFolder = {
                    id: 2,
                    foldername: 'XSS Attack &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
                    date_created: '1919-12-22T16:28:32.615Z'
                }

                return supertest(app)
                    .patch(`/api/folders/${testFolder.id}`)
                    .send(maliciousFolderPatch)
                    .expect(204)
                    .then(postRes => 
                        supertest(app)
                            .get(`/api/folders/${testFolder.id}`)
                            .expect(expectedFolder)
                    )
            })
          })
    })  
})