const mysql = require('mysql');
const CONFIG = require('../config.json');

const mysql_host = process.env.MYSQL_HOST || CONFIG.mysql_host;
const mysql_user = process.env.MYSQL_USER || CONFIG.mysql_user;
const mysql_password = process.env.MYSQL_PASSWORD || CONFIG.mysql_password;
const mysql_database = process.env.MYSQL_DATABASE || CONFIG.mysql_database;


class MySQLConnector {
    constructor(host = mysql_host,
        user = mysql_user,
        password = mysql_password,
        database = mysql_database) {

        this.connection = mysql.createPool({
            host,
            user,
            password,
            database,
            multipleStatements: true
        });

        // this.connection.connect();
    }

    query(queryString, escapeValues) {
        return new Promise((resolve, reject) => {
            this.connection.query(queryString, escapeValues, function (error, results, fields) {
                if (error) {
                    reject(error);
                    return;
                }

                resolve(results)
            })
        })
    }

    close() {
        this.connection.end();
    }
}

module.exports = MySQLConnector