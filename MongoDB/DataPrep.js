////////////////// POLL RESULTS ////////////////////////////
// Add year field to each collection
db["2016_poll_results"].updateMany({}, { $set: { year: 2016 } });
db["2017_poll_results"].updateMany({}, { $set: { year: 2017 } });
db["2018_poll_results"].updateMany({}, { $set: { year: 2018 } });
db["2019_poll_results"].updateMany({}, { $set: { year: 2019 } });
db["2021_poll_results"].updateMany({}, { $set: { year: 2021 } });
db["2022_poll_results"].updateMany({}, { $set: { year: 2022 } });
db["2023_poll_results"].updateMany({}, { $set: { year: 2023 } });



db.createCollection("poll_results_all_years");

// Concatenate collections by merging documents into 'poll_results_all_years'
var years = ["2016", "2017", "2018", "2019", "2021", "2022", "2023"];

years.forEach(function(year) {
    db[year + "_poll_results"].find().forEach(function(doc) {
        db.poll_results_all_years.insertOne(doc);
    });
});


////////////////// JURY RESULTS /////////////////////////////

// Add year field to each collection
db["2016_jury_results"].updateMany({}, { $set: { year: 2016 } });
db["2017_jury_results"].updateMany({}, { $set: { year: 2017 } });
db["2018_jury_results"].updateMany({}, { $set: { year: 2018 } });
db["2019_jury_results"].updateMany({}, { $set: { year: 2019 } });
db["2021_jury_results"].updateMany({}, { $set: { year: 2021 } });
db["2022_jury_results"].updateMany({}, { $set: { year: 2022 } });
db["2023_jury_results"].updateMany({}, { $set: { year: 2023 } });


// Create the collection 'jury_results_all_years' if it doesn't exist
db.createCollection("jury_results_all_years");

// Concatenate collections by merging documents into 'jury_results_all_years'
var years = ["2016", "2017", "2018", "2019", "2021", "2022", "2023"];

years.forEach(function(year) {
    db[year + "_jury_results"].find().forEach(function(doc) {
        db.jury_results_all_years.insertOne(doc);
    });
});


////////////////// TELEVOTE RESULTS /////////////////////////////

// Add year field to each collection
db["2016_televote_results"].updateMany({}, { $set: { year: 2016 } });
db["2017_televote_results"].updateMany({}, { $set: { year: 2017 } });
db["2018_televote_results"].updateMany({}, { $set: { year: 2018 } });
db["2019_televote_results"].updateMany({}, { $set: { year: 2019 } });
db["2021_televote_results"].updateMany({}, { $set: { year: 2021 } });
db["2022_televote_results"].updateMany({}, { $set: { year: 2022 } });
db["2023_televote_results"].updateMany({}, { $set: { year: 2023 } });


// Create the collection 'televote_results_all_years' if it doesn't exist
db.createCollection("televote_results_all_years");

// Concatenate collections by merging documents into 'televote_results_all_years'
var years = ["2016", "2017", "2018", "2019", "2021", "2022", "2023"];

years.forEach(function(year) {
    db[year + "_televote_results"].find().forEach(function(doc) {
        db.televote_results_all_years.insertOne(doc);
    });
});


///////////// CONCAT JURY AND TELEVOTE RESULTS INTO ONE TABLE ///////////

// Create the new collection 'Results_all_years' if it doesn't exist
db.createCollection("Results_all_years");

// Merge documents from 'jury_results_all_years' into 'Results_all_years' with 'Jury/Televote' field set to 'Jury'
db.jury_results_all_years.find().forEach(function(doc) {
    doc["Jury/Televote"] = "Jury";
    db.Results_all_years.insertOne(doc);
});

// Merge documents from 'televote_results_all_years' into 'Results_all_years' with 'Jury/Televote' field set to 'Televote'
db.televote_results_all_years.find().forEach(function(doc) {
    doc["Jury/Televote"] = "Televote";
    db.Results_all_years.insertOne(doc);
});

// We noticed the name of the "Czech Republic" is changed to "Czechia" in 2023.
// After checking the other table's too, we changed "Czechia" data into "Czech Republic" and
// deleted the data related to the old name.

// Rename "Czech Republic" field to "Czechia" and preserve its value
// Find documents where 'Czechia' field exists
db.Results_all_years.find({ "Czechia": { $exists: true } }).forEach(function(doc) {
    // Set the value of 'Czech Republic' field to the value of 'Czechia' field
    db.Results_all_years.update(
        { "_id": doc._id }, // Find the document by its _id
        { $set: { "Czech Republic": doc.Czechia } } // Set 'Czech Republic' field to the value of 'Czechia' field
    );
});

// Remove 'Czechia' field from all documents
db.Results_all_years.updateMany({}, { $unset: { "Czechia": "" } });


// Fix the winner data and add the missing value of 2023 

// Create winner_data collection with adjusted years and winner data
db.contest_data.aggregate([
    {
        $project: {
            years: { $subtract: ["$year", 1] }, // Subtract 1 from the year field
            winner: "$host" // Rename host field to winner
        }
    },
    {
        $out: "winner_data" // Output the transformed documents to winner_data collection
    }
]);

// Update winner data for 2022 to 'Ukraine'
db.winner_data.updateMany(
    { years: 2022 },
    { $set: { winner: "Ukraine" } }
);

// Update year value for 2020 to 2019
db.winner_data.updateMany(
    { years: 2020 },
    { $set: { years: 2019 } }
);

// Insert winner data for 2023
db.winner_data.insertOne({ years: 2023, winner: "Sweden" });


// Adding winner flag to song_data_winner collection

// Step 1: Perform the left join between song_data and winner_data
db.song_data.aggregate([
    {
        $lookup: {
            from: "winner_data",
            localField: "year",
            foreignField: "years",
            as: "winner_data"
        }
    },
    {
        $unwind: {
            path: "$winner_data",
            preserveNullAndEmptyArrays: true
        }
    },
    {
        $addFields: {
            winner_flag: {
                $cond: {
                    if: { $and: [{ $eq: ["$year", "$winner_data.years"] }, { $eq: ["$country", "$winner_data.winner"] }] },
                    then: 1,
                    else: 0
                }
            }
        }
    },
    {
        $out: "song_data_winner"
    }
]);

// Step 2: Clean up the collection by removing the fields "years" and "winner"
db.song_data_winner.updateMany(
    {},
    { $unset: { "winner_data": "" } }
);
