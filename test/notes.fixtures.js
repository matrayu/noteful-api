function makeNotesArray() {
    return [
        {
            id: 1, 
            title: 'note title 1',
            content: 'note content 1',
            folder_id: 2,
            date_created: '2029-01-22T16:28:32.615Z',
            date_modified: '2029-01-22T16:28:32.615Z'
        },
        {
            id: 2, 
            title: 'note title 2',
            content: 'note content 2',
            folder_id: 2,
            date_created: '2100-05-22T16:28:32.615Z',
            date_modified: '2100-05-25T17:28:32.615Z'
        },
        {
            id: 3, 
            title: 'note title 3',
            content: 'note content 3',
            folder_id: 2,
            date_created: '1919-12-22T16:28:32.615Z',
            date_modified: '1920-06-22T16:28:32.615Z'
        }
    ]
}

function makeMaliciousNote() {
    const maliciousNote = {
        id: 911,
        title: 'Naughty naughty very naughty <script>alert("xss");</script>',
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist" onerror="alert(document.cookie);">. But not <strong>all</strong> bad.',
        folder_id: 2,
        date_created: '1919-12-22T16:28:32.615Z',
        date_modified: '1920-06-22T16:28:32.615Z'
    }

    const expectedNote = {
        ...maliciousNote,
        title: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
        content: 'Bad image <img src="https://url.to.file.which/does-not.exist">. But not <strong>all</strong> bad.'
    }

    return {
        maliciousNote,
        expectedNote
    }
}

module.exports = {
    makeNotesArray,
    makeMaliciousNote
}