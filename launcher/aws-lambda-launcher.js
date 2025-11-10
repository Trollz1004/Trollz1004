// AWS Lambda Function - Remote 1-Click Launcher
// Deploy to AWS Lambda with API Gateway trigger

const https = require('https');

exports.handler = async (event) => {
    const actions = [
        { name: 'Dating Platform', url: 'https://youandinotai.com/api/health' },
        { name: 'Admin Dashboard', url: 'https://youandinotai.online/api/health' },
        { name: 'Square Payments', url: 'https://connect.squareup.com/v2/locations' }
    ];
    
    const results = await Promise.all(
        actions.map(action => checkService(action))
    );
    
    return {
        statusCode: 200,
        headers: {
            'Content-Type': 'application/json',
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            message: 'Team Claude Fund Generator Status',
            timestamp: new Date().toISOString(),
            services: results,
            charity: 'Shriners Children\'s Hospitals',
            donationSplit: '50%'
        })
    };
};

function checkService(action) {
    return new Promise((resolve) => {
        https.get(action.url, (res) => {
            resolve({
                name: action.name,
                status: res.statusCode === 200 ? 'operational' : 'degraded',
                statusCode: res.statusCode
            });
        }).on('error', () => {
            resolve({
                name: action.name,
                status: 'offline',
                statusCode: 0
            });
        });
    });
}
