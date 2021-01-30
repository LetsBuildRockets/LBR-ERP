var sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');
const fs = require('fs');
var db = new sqlite3.Database('R:/ERP.db');

const USD_SCALE = 1e5

require('yargs')
.scriptName('LBR-ERP')
.usage('$0 <cmd> [args]')
.command('insert-parts', 'insert parts into catalog from CSV', (y) => {
  return y.option('file', {
    description: 'filepath to csv',
    required: true
  });
}, (argv) => {
  load_csv(argv.file)
  .catch((error) => {
    console.error(error.message);
  })
  .finally(() => {
    console.log('closing db');
    db.close();
  });
})
.command('get-part', 'get part info from catalog', (y) => {
  return y.option('partnumber', {
    description: 'mfg part number',
    required: true
  });
}, (argv) => {
  getPart(argv.partnumber)
  .then((row) => {
    console.log(row);
  })
  .catch((error) => {
    console.error(error.message);
  })
  .finally(() => {
    console.log('closing db');
    db.close();
  });
})
.command('update-qty', 'update part qty_on_hand', (y) => {
  return y.option('partnumber', {
    description: 'mfg part number',
    required: true
  }).option('qty', {
    description: 'new qty_on_hand',
    required: true
  });
}, (argv) => {
  updateQty(argv.partnumber, argv.qty)
  .catch((error) => {
    console.error(error.message);
  })
  .finally(() => {
    console.log('closing db');
    db.close();
  });
})
.command('get-inventory', 'get all parts that are on hand', (y) => {
  // no options
}, (argv) => {
  getPartsOnHand()
  .then((rows) => {
    rows.forEach((row) => {
      console.log(row);
    });
  })
  .catch((error) => {
    console.error(error.message);
  })
  .finally(() => {
    console.log('closing db');
    db.close();
  });
})
.command('setup', 'setupDV', (y) => {
  // no options
}, (argv) => {
  setupDB()
  .catch((error) => {
    console.error(error.message);
  })
  .finally(() => {
    console.log('closing db');
    db.close();
  });
})
.argv;

function setupDB() {
  return new Promise((resolve, reject) => {
    db.serialize(() => {
      console.log("Setting up DB...");
      db.run("CREATE TABLE IF NOT EXISTS catalog (mfg_pn TEXT, description TEXT, cost INTEGER, qty_on_hand INTEGER, UNIQUE(mfg_pn))", (err) => {
        if(err) {
          reject(err);
        }
      });
    });
    resolve();
    console.log("DB Setup Done!");
  });
};

function load_csv(csv_URI) {
  return new Promise((resolve, reject) => {
    fs.createReadStream(csv_URI)
    .pipe(csv({ separator: ',' , strict: true}))
    .on('data', (row) => {
      console.log('import', row['LIBRARYREFERENCE']);
      db.run('INSERT OR IGNORE INTO catalog  VALUES(?,?,?,?)', [row['LIBRARYREFERENCE'],row['DESCRIPTION'],Math.round(row['UNIT PRICE (USD)']*USD_SCALE), 0], (err) => {
        if (err) {
          reject(err);
        }
      });
    })
    .on('end', () => {
      console.log('CSV file successfully processed', csv_URI);
      resolve()
    });
  });
};

function updateQty(mfg_pn, newQty) {
  return new Promise((resolve, reject) => {
    db.run('UPDATE catalog SET qty_on_hand = ? WHERE mfg_pn = ?', [newQty, mfg_pn], (err) => {
      if (err) {
        reject(err);
      } else {
        resolve()
      }
    })
  });
}

function getPart(mfg_pn) {
  return new Promise((resolve, reject) => {
    db.get("SELECT * FROM catalog WHERE mfg_pn=?", [mfg_pn], (err, row)  => {
      if (err) {
        reject(err);
      } else {
        resolve(row)
      }
    })
  });
}


function getPartsOnHand() {
  return new Promise((resolve, reject) => {
    db.all("SELECT * FROM catalog WHERE qty_on_hand > 0", (err, rows)  => {
      if (err) {
        reject(err);
      } else {
        resolve(rows)
      }
    })
  });
}

/*
setupDB()
.then(() => {
Promise.all([
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/KEMET.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Panasonic/Panasonic_ERJ_0402/Panasonic_ERJ_0402.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Panasonic/Panasonic_ERJ_0603/Panasonic_ERJ_0603.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Panasonic/Panasonic_ERJ_0805/Panasonic_ERJ_0805.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Panasonic/Panasonic_ERJ_1206/Panasonic_ERJ_1206.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Panasonic/Panasonic_ERJ_2512/Panasonic_ERJ_2512.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Murata/capacitor_murata_0402/capacitor_murata_0402$.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Murata/capacitor_murata_0603/capacitor_murata_0603$.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Murata/capacitor_murata_0805/capacitor_murata_0805$.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Murata/capacitor_murata_1206/capacitor_murata_1206$.csv'),
load_csv('C:/active/Modular-Payload-System/Hardware/lib/Altium-libs-Shared/Murata/capacitor_murata_1210/capacitor_murata_1210$.csv')])
.then(() => {
console.log("done importing")
db.each("SELECT rowid, mfg_pn, description, cost, qty_on_hand FROM catalog", function(err, row) {
//console.log(row.rowid, row.mfg_pn, '$'+row.cost/USD_SCALE, row.description);
if (err) {
console.log(err.message);
}
});
updateQty('GRT188C81C225ME13D', 0)
.finally(() => {
console.log('closing db');
db.close();
});;
})
.catch((error) => {
console.error(error.message);
})
})
.catch((error) => {
console.error(error.message);
});*/
