const stringify = (jsonData) => {
    return JSON.stringify(jsonData);
}

const sleep = async (ms) => {
    return new Promise(resolve => setTimeout(resolve, ms));
}

module.exports = { stringify, sleep }