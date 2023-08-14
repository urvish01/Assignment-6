/********************************************************************************* 

WEB322 – Assignment 02 
I declare that this assignment is my own work in accordance with Seneca
Academic Policy.  No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students. I acknoledge that violation of this policy
to any degree results in a ZERO for this assignment and possible failure of
the course. 

Name:   
Student ID:   
Date:  
Cyclic Web App URL:  
GitHub Repository URL:  

********************************************************************************/  

const fs = require("fs");

let items = [];
let categories = [];

module.exports.initialize = function () {
    return new Promise((resolve, reject) => {
        fs.readFile('./data/items.json', 'utf8', (err, data) => {
            if (err) {
                reject(err);
            } else {
                items = JSON.parse(data);

                fs.readFile('./data/categories.json', 'utf8', (err, data) => {
                    if (err) {
                        reject(err);
                    } else {
                        categories = JSON.parse(data);
                        resolve();
                    }
                });
            }
        });
    });
}


module.exports.getItemById = function(id){
    return new Promise((resolve,reject)=>{
        let foundItem = items.find(item => item.id == id);

        if(foundItem){
            resolve(foundItem);
        }else{
            reject("no result returned");
        }
    });
}

module.exports.getAllItems = function(){
    return new Promise((resolve,reject)=>{
        (items.length > 0 ) ? resolve(items) : reject("no results returned"); 
    });
}

module.exports.getPublishedItems = function(){
    return new Promise((resolve,reject)=>{
        (items.length > 0) ? resolve(items.filter(item => items.published)) : reject("no results returned");
    });
}

module.exports.getCategories = function(){
    return new Promise((resolve,reject)=>{
        (categories.length > 0 ) ? resolve(categories) : reject("no results returned"); 
    });
}

module.exports.addItem = function(itemData){
    return new Promise((resolve,reject)=>{
        // check if published is true or not. 
        itemData.published = itemData.published ? true : false;

        // increase the Id by 1, for our 'index'
        itemData.id = items.length + 1;

        // push the item to the dataStore
        items.push(itemData);

        // resolve the promise
        resolve();
    });
}

module.exports.getItemsByCategory = function(category){
    return new Promise((resolve,reject)=>{
        let filteredItems = items.filter(item=>item.category == category);

        if(filteredItems.length == 0){
            reject("no results returned")
        }else{
            resolve(filteredItems);
        }
    });
}

module.exports.getItemsByMinDate = function(minDateStr) {
    return new Promise((resolve, reject) => {
        let filteredItems = items.filter(item => (new Date(item.postDate)) >= (new Date(minDateStr)))

        if (filteredItems.length == 0) {
            reject("no results returned")
        } else {
            resolve(filteredItems);
        }
    });
}

module.exports.getPublishedItemsByCategory = function(category){
    return new Promise((resolve,reject)=>{
        let filteredItems = items.filter(item => item.published && item.category == category);
        (filteredItems.length > 0) ? resolve(filteredItems) : reject("no results returned");
    });
}
