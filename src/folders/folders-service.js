const FoldersService = {
    //use this Knex instance to query the noteful_folders table
    getAllfolders(knex) {
        return knex.select('*').from('noteful_folders')
    },
    insertNote(knex, newFolder) {
        return knex
            .insert(newFolder)
            .into('noteful_folders')
            //.returning() method we can specify which columns we want to select.
            .returning('*')
            //pull out the object from the array we are accessing
            //we've inserted 1 object to an empty array
            .then(rows => {
                return rows[0];
            });
    },
    getById(knex, id) {
        //select all folders where the id is the id passed in retriving the first record
        return knex.from('noteful_folders')
            .select('*')
            .where('id', id)
            .first()
    },
    //cleanest way to write the above - no select and calling id directly
    deleteFolder(knex, id) {
        /* return Promise.resolve({}) */
        return knex('noteful_folders')
            .where({ id })
            .delete()
    },
    updateFolder(knex, id, newFoldersFields) {
        return knex('noteful_folders')
            .where({ id })
            .update(newFoldersFields)
    },
}

module.exports = FoldersService;