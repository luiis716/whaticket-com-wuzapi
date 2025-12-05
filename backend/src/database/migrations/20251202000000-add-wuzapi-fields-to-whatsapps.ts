import { QueryInterface, DataTypes } from "sequelize";

module.exports = {
    up: (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.addColumn("Whatsapps", "type", {
                type: DataTypes.STRING,
                allowNull: false,
                defaultValue: "wwebjs"
            }),
            queryInterface.addColumn("Whatsapps", "wuzapiUrl", {
                type: DataTypes.TEXT,
                allowNull: true
            }),
            queryInterface.addColumn("Whatsapps", "wuzapiInstanceId", {
                type: DataTypes.TEXT,
                allowNull: true
            }),
            queryInterface.addColumn("Whatsapps", "wuzapiToken", {
                type: DataTypes.TEXT,
                allowNull: true
            })
        ]);
    },

    down: (queryInterface: QueryInterface) => {
        return Promise.all([
            queryInterface.removeColumn("Whatsapps", "type"),
            queryInterface.removeColumn("Whatsapps", "wuzapiUrl"),
            queryInterface.removeColumn("Whatsapps", "wuzapiInstanceId"),
            queryInterface.removeColumn("Whatsapps", "wuzapiToken")
        ]);
    }
};
