const { unlink } = require('fs/promises');
const fs = require('fs');
const csv = require('csv-parser');

const deleteFile = function(filePath){

    return unlink(filePath);

}

const readCSVFile = function(filePath){

    return new Promise( function(resolve, reject){

        let results = [];

        fs.createReadStream(filePath)
            .pipe(csv())
            .on('data', (data)=> results.push(data))
            .on('end', ()=>{
                resolve(results);
            })
            .on('error', (err) => {
                if(err.code == "ENOENT"){
                    reject(new Error(filePath + " - File does not exists"));
                    return;
                }
            });

    });

}

module.exports = {
    deleteFile,
    readCSVFile
}