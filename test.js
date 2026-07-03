const mongoose = require("mongoose");

mongoose.connect(
  "mongodb+srv://anurag4u4033_db_user:anuragAtlas1234@cluster0.cfxqbzc.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0"
)
.then(() => {
  console.log("Connected");
  process.exit(0);
})
.catch(err => {
  console.error(err);
  process.exit(1);
});