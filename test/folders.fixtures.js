function makeFoldersArray() {
    return [
        {
            id: 1,
            foldername: 'Folder 1',
            date_created: '2029-11-22T16:28:32.615Z',
        },
        {
            id: 2,
            foldername: 'Folder 2',
            date_created: '2019-08-23T16:28:32.615Z',
        },
        {
            id: 3,
            foldername: 'Folder 3',
            date_created: '2016-05-01T16:28:32.615Z',
        }
    ]
}

function makeMaliciousFolder() {
    const maliciousFolder = {
        id: 911,
        foldername: 'Naughty naughty very naughty <script>alert("xss");</script>',
        date_created: '1919-12-22T16:28:32.615Z'
    }

    const expectedFolder = {
        ...maliciousFolder,
        foldername: 'Naughty naughty very naughty &lt;script&gt;alert(\"xss\");&lt;/script&gt;',
    }

    return {
        maliciousFolder,
        expectedFolder
    }
}

module.exports = {
    makeFoldersArray,
    makeMaliciousFolder
}