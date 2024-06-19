// const Employee = require("../models/employeeType");
const Project = require('../models/project')
const CrudRouter = require('../lib/crudrouter')
const nodemailer = require('nodemailer');
const mongoose = require('mongoose');
const validator = require('../lib/validate');
const Employee = require('../models/employeeType');
const jwt = require('jsonwebtoken');
const secret = 'hjcvdjhucygdcbkjcbkjacb465d4c465465464sdsd5464';


const defaultFilter = (req, res, next) => {
  //let { siteInfo } = res.locals;
  res.locals.query = { 
    // siteId: "123",
    // isActive: 1
  };
  //res.locals.defaultQuery = {...res.locals.query};
  next();
}


const defaultProjection = (req, res, next) => {
  res.locals.projection = {};
  next();
}


const defaultSort = (req, res, next) => {
  res.locals.sort = {
    order: "asc"
  };
  next(); 
}


const dynamicSort = (req, res, next) => {
  let { sort = {} } = res.locals || {};
  let sortKeys = Object.keys(sort);

  let defalutSortBy = (sortKeys && sortKeys[0]) ? sortKeys[0] : "order";
  let defalutSortOrder = (sortKeys && sortKeys[0]) ? sort[sortKeys[0]] : "asc";

  let {
    sortBy = defalutSortBy, order = defalutSortOrder
  } = req.query || {};

  let possibleOrderValues = {
    asc: 1,
    desc: -1
  };

  let possibleOrderFields = {
    "id": "_id",
    "name": "name",
    "order": "order",
    "createdAt": "createdAt",
    "updatedAt": "updatedAt"
  };

  if(!Object.keys(possibleOrderValues).includes(order)) {
    order = defalutSortOrder
  }

  if(!Object.keys(possibleOrderFields).includes(sortBy)) {
    sortBy = defalutSortBy
  }

  res.locals.sort = {
    [possibleOrderFields[sortBy]] : possibleOrderValues[order]
  }
  next();
}



const dynamicProjection = (req, res, next) => {
  let { fieldSet = null } = req.query || {};
  if(fieldSet) {
    fieldSet = fieldSet.split(',');
    res.locals.projection = fieldSet.reduce((a,b)=> (a[b] = 1,a),{});
  }
  next();
}


const dynamicSearchAndFilter = (req, res, next) => {
  let values = {};
  let { query = {} } = res.locals || {};

  if(req.method == "POST") {
    let{ search = undefined, filter = {} } = req.body || {};

    if(search) values['search'] = search;

    if(filter) {
      if(filter.ids) {
        values['ids'] = filter.ids
      }
      if (filter.hasOwnProperty("isActive") && typeof filter.isActive === "boolean") {
        values['isActive'] = filter.isActive ? true : false
      }
    }
  }
  if(req.method == "GET") {
    let{ search = undefined, ids = undefined } = req.query || {};

    if(search) values['search'] = search;
    if(ids) values['ids'] = ids.split(",");
  }

  let rules = {
    "search": "sometimes|required|string|max:300",
    "ids": "sometimes|required|array|min:1",
    "ids.*": "required|mongo_object_id"
  };

  validator(values, rules, {}, {}, (err, status) => {
    if (!status) {
      if(err && err.errors) {
        let errorMessage = new Error(err.errors[Object.keys(err.errors)[0]][0]);
        errorMessage.status = 400;
        next(errorMessage);
      } else {
        next(err);  
      }
    } else {
      if(values["search"]) {
        query = Object.assign(query, {
          $text: {
            $search: values["search"]
          }
        });
      }
    
      if(values['ids']) {
        query = Object.assign(query, {
          "_id": {
            "$in": values['ids']
          }
        })
      }
      if (values.hasOwnProperty("isActive")) {
        query.isActive = values.isActive
      }
      next();
    }
  });
}


const sendingMail = (req,res,next) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yaswanth35000@gmail.com',
        pass: 'bmct egzh pqca jzsp'
    }
});
//  console.log(res.locals);
 let {data} = res.locals;


let mailOptions = {
    from: 'yaswanth35000@gmail.com',
    to: `${data.email}`,
    subject: 'Test Email',
    text: 'Data has been created !!!'
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Message sent: %s', info.messageId);
});
next();
}


const sendingUpdateMail = (req,res,next) => {
  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: 'yaswanth35000@gmail.com',
        pass: 'bmct egzh pqca jzsp'
    }
});
 console.log(res.locals);
 let {record} = res.locals;

let mailOptions = {
    from: 'yaswanth35000@gmail.com',
    to: `${record.email}`,
    subject: 'Test Email',
    text: `Data has been updated, ID:${record.id}`
};

transporter.sendMail(mailOptions, (error, info) => {
    if (error) {
        return console.log(error);
    }
    console.log('Message sent: %s', info.messageId);
});
next();
}


const formatRules = (req, res, next) => {
  res.locals.rules = {
    // "name": "required|string|max:300",
    "name": "required|string|max:300"
    
  };
  if(req.method.toLowerCase() === 'patch') {
    Object.keys(res.locals.rules).forEach(x => { 
      if(x.indexOf("*") === -1 && res.locals.rules[x].indexOf("required") !== -1) {
        res.locals.rules[x] = "sometimes" + res.locals.rules[x];
      } 
    })
  }
  next();
}


async function createProjectWithEmployee(req, res, next) {
  try {
    const { id, name, employeeID } = req.body;
    // Find the employee by ID
    const employee = await Employee.findById(employeeID);
    if (!employee) {
      return res.status(404).send({ error: 'Employee not found' });
    }

    // Create the project and associate it with the employee
    // const project = new Project({ id, name, employee: employee._id });
    // // console.log(employee);
    // await project.save();

    // res.status(201).send(project);
  } catch (error) {
    res.status(400).send({ error: error.message });
  }
next();
}


const validateRequest = (req, res, next) => {
  let { body: data } = req || {};
  let { rules = {}, customMessage = {} } = res.locals || {};

  validator(data, rules, customMessage, {}, (err, status) => {

    if (!status) {
      if(err && err.errors) {
        let errorMessage = new Error(err.errors[Object.keys(err.errors)[0]][0]);
        errorMessage.status = 400;
        next(errorMessage);
      } else {
        next(err);  
      }
    } else {
      res.locals.validatedData = data;
      next();
    }
  });
}


const checkAuthenticated = (req, res, next) => {

  const payload = {
    name: 'Yash',
    employeeID: '666827c193bef5392e079475'
};

var token = jwt.sign(payload, secret);
// console.log(token);


  const authHeader = req.headers['authorization'];
    var token = authHeader.split(' ')[1];
    if (token == null) return res.sendStatus(401);

    jwt.verify(token, secret, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
}



const authorizeEditProject = async (req, res, next) => {
  const projectId = req.params.id;
    const employeeId = req.user.employeeID;
    try {
        const project = await Project.findById(projectId);
        if (!project) {
            return res.status(404).send('Project not found');
        }
        const aaa = project.employeeID 
        const b = JSON.stringify(aaa);
        const trimmedString = b.slice(1, -1);
        if (trimmedString !== employeeId) {
            return res.status(403).send('You are not authorized to edit this project');
        }
        next();
    } catch (error) {
        res.status(500).send('Server error');
    }
}


const formatAgencyType = (req, res, next) => {
  let { validatedData } = res.locals || {};
  let { 
    name = undefined,
    id = undefined,
    employeeID
  } = validatedData || {};
  let { siteInfo } = res.locals;
  res.locals.data = {
    name,
    id,
    employeeID
  };
  next();
}


const validations = {
  "create": [
    formatRules,
    validateRequest,
    formatAgencyType,
    createProjectWithEmployee
  ],

  "postCreate":[
    // sendingMail
  ],

  "list": [
    defaultFilter,
    defaultProjection,
    dynamicProjection,
    defaultSort,
    dynamicSort,
    dynamicSearchAndFilter
  ],

  "read": [
    defaultFilter,
    defaultProjection,
    dynamicProjection
  ],

  "update": [
    checkAuthenticated,
    defaultFilter,
    authorizeEditProject,
    formatRules,
    validateRequest,
    formatAgencyType
  ],

  "postUpdate":[
    // sendingUpdateMail
  ],

  "delete": [
    defaultFilter
  ],
}
     

// const crudRouter = new CrudRouter(Employee, validations, 'Employee Type');
const cs = new CrudRouter(Project, validations, 'Project Type');
// module.exports = [crudRouter.router];
module.exports = [cs.router];

