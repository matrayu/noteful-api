const NotesService = {
    //use this Knex instance to query the noteful_notes table
    getAllNotes(knex) {
        return knex.select('*').from('noteful_notes')
    },
    insertNote(knex, newNote) {
        return knex
            .insert(newNote)
            .into('noteful_notes')
            //.returning() method we can specify which columns we want to select.
            .returning('*')
            //pull out the object from the array we are accessing
            //we've inserted 1 object to an empty array
            .then(rows => {
                return rows[0];
            });
    },
    getById(knex, id) {
        /* return Promise.resolve({}) */
        
        //select all notes where the id is the id passed in retriving the first record
        return knex.from('noteful_notes')
            .select('*')
            .where('id', id)
            .first()
    },
    //cleanest way to write the above - no select and calling id directly
    deleteNote(knex, id) {
        /* return Promise.resolve({}) */
        return knex('noteful_notes')
            .where({ id })
            .delete()
    },
    updateNote(knex, id, newNotesFields) {
        return knex('noteful_notes')
            .where({ id })
            .update(newNotesFields)
    },
}

module.exports = NotesService;