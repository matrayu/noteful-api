const { makeNotesArray, makeMaliciousNote } = require('./notes.fixtures');
const { makeFoldersArray } = require('./folders.fixtures');
const knex = require('knex');
const app = require('../src/app');

describe(`Notes Endpoints`, function() {
    let db;

    before('make knex instance', () => {
        db = knex({
            client: 'pg',
            connection: process.env.TEST_DB_URL
        })
        app.set('db', db)
    })

    after('disconnect from db', () => db.destroy())

    afterEach('cleanup', () => db.raw('TRUNCATE noteful_notes, noteful_folders RESTART IDENTITY CASCADE'))

    describe('GET /api/notes', () => {
        context('Given no notes', () => {
          it('responds with 200 and an empty list', () => {
            return supertest(app)
              .get('/api/notes')
              .expect(200, [])
          })
        })

        context('Given there are notes in the database', () => {
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

          it('responds with 200 and all the notes', () => {
            return supertest(app)
              .get('/api/notes')
              .expect(200, testNotes)
          })
        })

        context('Given an XSS attack note', () => {
          const { maliciousNote, expectedNote } = makeMaliciousNote();
          const testFolders = makeFoldersArray();

          beforeEach('insert malicious note', () => {
            return db
              .into('noteful_folders')
              .insert(testFolders)
              .then(() => {
                return db
                  .into('noteful_notes')
                  .insert([ maliciousNote ])
              })
          })

          it('responds with 200 and removes XSS attack content', () => {
            return supertest(app)
              .get('/api/notes')
              .expect(200)
              .expect(res => {
                expect(res.body[0].title).to.eql(expectedNote.title)
                expect(res.body[0].content).to.eql(expectedNote.content)
              })
          })
        })
    })

    describe('GET /api/notes/:notes_id', () => {
      context('Given note id cannot be found', () => {
        it('responds with a 404 and error', () => {
          const noteId = 999;
          return supertest(app)
            .get(`/api/notes/${noteId}`)
            .expect(404, {
              error: `Note with id ${noteId} not found`
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
          const noteId = 2
          const expectedNote = testNotes[noteId - 1]
          return supertest(app)
            .get(`/api/notes/${noteId}`)
            .expect(200, expectedNote)
        })
      })

      context('Given an XSS attack note', () => {
        const { maliciousNote, expectedNote } = makeMaliciousNote();
        const testFolders = makeFoldersArray();

        beforeEach('insert malicious note', () => {
          return db
            .into('noteful_folders')
            .insert(testFolders)
            .then(() => {
              return db
                .into('noteful_notes')
                .insert([ maliciousNote ])
            })
        })

        it('responds with a 200 and removes the XSS attack content', () => {
          return supertest(app)
            .get(`/api/notes/${maliciousNote.id}`)
            .expect(200)
            .expect(res => {
              expect(res.body.title).to.eql(expectedNote.title)
              expect(res.body.content).to.eql(expectedNote.content)
            })
        })
      })
    })

    describe('POST /api/notes', () => {
      const testFolders = makeFoldersArray();

      beforeEach('insert folders', () => {
        return db
          .into('noteful_folders')
          .insert(testFolders)
      })

      it('responds with a 201 and creates and new note', () => {
        this.retries(3);
        
        const newNote = {
          title: 'new title',
          content: 'new content',
          folder_id: 2
        };

        return supertest(app)
          .post('/api/notes')
          .send(newNote)
          .expect(201)
          .expect(res => {
            expect(res.body.title).to.eql(newNote.title)
            expect(res.body.content).to.eql(newNote.content)
            expect(res.body.folder_id).to.eql(newNote.folder_id)
            expect(res.body).to.have.property('id')
            expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`)
            const expected = new Date().toLocaleString
            const actualCreated = new Date(res.body.date_created).toLocaleString
            const actualModified = new Date(res.body.date_modified).toLocaleString
            expect(actualCreated).to.eql(expected)
            expect(actualModified).to.eql(expected)
          })
          //implicit return so it waits for the response data
          .then(postRes =>
            supertest(app)
              .get(`/api/notes/${postRes.body.id}`)
              .expect(postRes.body)
          )
      })

      const requiredFields = ['title', 'folder_id'];

      requiredFields.forEach(field => {
        const newNote = {
          title: 'new title',
          folder_id: 2
        }

        it(`responds with 400 and an error when ${field} is missing`, () => {
          delete newNote[field];

          return supertest(app)
            .post('/api/notes')
            .send(newNote)
            .expect(400, {
              error: `Missing ${field} in the request body`
            })
        })
      })

      context('Given an XSS attack note', () => {
        const { maliciousNote, expectedNote } = makeMaliciousNote();
        const testFolders = makeFoldersArray();

        beforeEach('insert malicious note', () => {
          return db
            .into('noteful_notes')
            .insert([ maliciousNote ])
        })

        it('responds with a 201 and removes the XSS attack content', () => {
          return supertest(app)
            .post(`/api/notes`)
            .send(maliciousNote)
            .expect(201)
            .expect(res => {
              expect(res.body.title).to.eql(expectedNote.title)
              expect(res.body.content).to.eql(expectedNote.content)
            })
        })
      })
    })

    describe('DELETE /api/notes', () => {
      context('Given no notes', () => {
        it(`responds with a 404 and an error`, () => {
          const noteId = 999;
          return supertest(app)
            .delete(`/api/notes/${noteId}`)
            .expect(404, {
              error: `Note with id ${noteId} not found`
            })
        })
      })

      context(`Given the note ID is in the database`, () => {
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

        it(`responds with a 204 and removes the note`, () => {
          const noteToRemove = 2;
          const expectedNotes = testNotes.filter(note => note.id != noteToRemove)
          return supertest(app)
            .delete(`/api/notes/${noteToRemove}`)
            .expect(204)
              .then(res => 
                supertest(app)
                  .get(`/api/notes`)
                  .expect(expectedNotes)
              )
        })
      })
    })

    describe('PATCH /api/notes', () => {
      context('Given no note ID found to patch', () => {
        it('responds with a 404 and error', () => {
          const noteId = 999
          return supertest(app)
            .patch(`/api/notes/${noteId}`)
            .expect(404, {
              error: `Note with id ${noteId} not found`
            })
        })
      })

      context('Given there is a note found to patch', () => {
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

        it(`responds with a 204 and updates the note`, () => {
          const idToPatch = 2;

          const patchedNote = {
            title: 'this is updated!',
            content: 'content is patched too!'
          };

          const expectedNote = {
            ...testNotes[idToPatch - 1],
            ...patchedNote
          }

          return supertest(app)
            .patch(`/api/notes/${idToPatch}`)
            .send(patchedNote)
            .expect(204)
            .then(res => 
              supertest(app)
                .get(`/api/notes/${idToPatch}`)
                .expect(expectedNote)
            )
        })

        it('responds with a 400 and an error when no required fields are provided', () => {
          const noteId = 2

          return supertest(app)
              .patch(`/api/notes/${noteId}`)
              .send({ nonRequiredField: 'foo' })
              .expect(400, {
                  error: `Request body must contain either 'title', 'content' or 'folder_id'`
              })
        })

        it('responds with a 204 and updates only the fields that were provided in the body', () => {
          const idToPatch = 2;

          const patchedNote = {
              title: 'patched title',
              content: 'patched content',
          };

          const expectedNote = {
              ...testNotes[idToPatch - 1],
              ...patchedNote
          }

          return supertest(app)
              .patch(`/api/notes/${idToPatch}`)
              .send({
                  ...patchedNote,
                  fieldToIgnore: 'this should not update'
              })
              .expect(204)
              .then(res => 
                  supertest(app)
                      .get(`/api/notes/${idToPatch}`)
                      .expect(expectedNote)
              )
        })
      })
    })
})