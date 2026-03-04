const axios = require('axios');

axios.get('http://localhost:3000/api/livros-externos?q=bestsellers')
    .then(res => {
        console.log('status', res.status);
        console.log('data', JSON.stringify(res.data, null, 2));
    })
    .catch(err => {
        if (err.response) {
            console.error('status', err.response.status);
            console.error('body', err.response.data);
        } else {
            console.error('error', err.message);
        }
    });