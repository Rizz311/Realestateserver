const express = require('express');

const app = express();

const moment = require('moment');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('appointments.sqlite');

const mailCalendarInvite = require('./mailcalendarinvite');

db.serialize(() => {
  // db.run("DROP TABLE appts"); // use to reset db
  // run create table in case there is no table (maybe first time run?)
  db.run('CREATE TABLE appts (d INTEGER UNIQUE, appt_type TEXT, name TEXT, email TEXT, phone TEXT)', (error) => {
    if (error) {
      console.log(error);
    } else {
      console.log('!!!!!!!!!!!!!!!!!created table!!!!!!!!!!!!!!!!!');
    }
  });
  const stmt = db.prepare("INSERT INTO appts VALUES (?, ?, 'Mark', 'masaltzman@gmail.com', '617-365-5099')", (error) => {
    if (error) {
      console.log('INSERT APPT:', error);
    }
  });
  for (let i = 10; i < 20; i += 2) {
    const m = moment().hour(i);
    stmt.run(m.valueOf(), `test${i}`, (error) => { if (error) { console.log(error); } });
  }
  stmt.finalize();
});

const port = 3001;

// CORS setup, will only allow client connections from
// localhost:3000
// needs to be changed for production
const whitelist = ['http://localhost:3000'];
const corsOptions = {
  origin(origin, callback) {
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log('!Not allowed by CORS');
      callback(new Error('Not allowed by CORS'));
    }
  },
};

// Then pass them to cors:
app.use(cors(corsOptions));

function dumpDB() {
  return new Promise((resolve, reject) => {
    db.all('select * from appts',
      (err, rows) => {
        if (err) {
          reject(err);
        } else {
          console.log('got rows: ', rows.length);
          resolve(rows);
        }
      });
  });
}

// Default appointment schedule for each day of the week
// These will be filtered out if appointments exist on those days
const defaultApptSched = [
  [12, 14, 15, 16], // S 0
  [10, 11, 12, 14, 15, 16, 17], // M 1
  [10, 11, 12, 14, 15, 16, 17], // T 2
  [10, 11, 12, 14, 15, 16, 17], // W 3
  [10, 11, 12, 14, 15, 16, 17], // Th 4
  [10, 11, 12, 14, 15, 16, 17], // F
  [10, 11, 12, 14, 15, 16], // S
];
const dayMillis = 86400 * 1000;

// get the appointment calendar for the given day
// uses the defaultApptSched for the given day of the week
// and then removes times if there are already appointments scheduled
// during those times
app.get('/availAppts', (req, res) => {
  // month is zero based, day of month (date) is not
  const apptDate = moment([req.query.year, req.query.month, req.query.date]).local();
  // get all appointments for the given date
  db.all('select d, appt_type from appts where d >= $start and d <= $end',
    { $start: apptDate.valueOf(), $end: apptDate.valueOf() + dayMillis },
    (err, rows) => {
      if (err) {
        console.log(err);
      }
      console.log('Found appointments already booked for this date:', apptDate);
      // copy the default schedule
      let apptSched = defaultApptSched[apptDate.day()].slice();
      // add hour, minute to the appts from the db in order to make it easier
      // to use them to filter the appt schedule below
      const rows2 = rows.map((row) => {
        const row2 = { d: row.d, appt_type: row.appt_type };
        const m = moment(row.d);
        row2.hour = m.hour();
        row2.minute = m.minute();
        return row2;
      });
      console.log('default sched for this date:', apptSched);

      // remove times from the default schedule if there's already an appt at that time
      apptSched = apptSched.filter(hour => !rows2.find(appt => appt.hour === hour));
      console.log('after filtering, apptSched: ', apptSched);
      res.status(200).json(apptSched);
    });
});

// reserves an appointment at the given time
// and sends emails to the agent and the customer
app.get('/reserveAppt', (req, res) => {
  const apptTime = moment([req.query.year, req.query.month, req.query.date, req.query.hour]);
  const apptTimestamp = apptTime.valueOf();
  db.serialize(() => {
    db.run('insert into appts (d, appt_type, name, email, phone) values ($d, $appt_type, $name, $email, $phone)', {
      $d: apptTimestamp,
      $appt_type: req.query.appt_type,
      $name: req.query.name,
      $email: req.query.email,
      $phone: req.query.phone,
    }, (error) => {
      if (error) {
        console.log(error);
        res.status(500).json({ error }); // ES6!!!!
      } else {
        console.log(dumpDB().then(rows => console.log(rows, apptTimestamp, req.query)));
        mailCalendarInvite.mailCalendarInvite(apptTime, apptTime.add(1, 'hour'), req.query.comments, req.query.email);
        res.status(200).end();
      }
    });
  });
});
app.listen(port, () => console.log(`RE server listening on port ${port}!`));

//  curl -H'Origin: http://localhost:3000' 'localhost:3001/availAppts?year=2019&month=0&date=3'