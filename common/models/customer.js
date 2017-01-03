'use strict';

var async = require('async');

module.exports = function(Customer) {
  Customer.disableRemoteMethod('upsert', true);
  Customer.disableRemoteMethod('updateAll', true);
  Customer.disableRemoteMethod('findOne', true);
  Customer.disableRemoteMethod('createChangeStream', true);
  Customer.disableRemoteMethod('deleteById', true);
  Customer.disableRemoteMethod('findById', true);
  Customer.disableRemoteMethod('create', true);
  Customer.disableRemoteMethod('find', false);
  Customer.disableRemoteMethod('exists', true);
  Customer.disableRemoteMethod('replace', true);
  Customer.disableRemoteMethod('replaceById', true);
  Customer.disableRemoteMethod('replaceOrCreate', true);
  Customer.disableRemoteMethod('updateById', true);
  Customer.disableRemoteMethod('upsertWithWhere', true);
  Customer.disableRemoteMethod('updateAttributes', true);
  Customer.disableRemoteMethod('count', true);
  var regex = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
  Customer.validatesUniquenessOf('email', {
    message: 'This email address is already existed'
  });
  Customer.validatesFormatOf('email', {
    with: regex,
    message: 'Not a valid Email'
  });

  Customer.observe('access', function(ctx, next) {
    var filter = ctx.query;
    if (!filter) {
      ctx.query = filter = {};
    }
    if (!filter.order) {
      filter.order = ["created DESC"];
    }
    next();
  });


  Customer.observe('before save', function(ctx, next) {
    if (ctx.instance) {
      if (ctx.isNewInstance) {
        ctx.instance.joiningDate = new Date();
        if (ctx.instance.referralId) {
          Customer.findById(ctx.instance.referralId, function(err, referrer) {
            if (!referrer || err) {
              return next(new Error("Please provide a valid referralId"));
            } else {
              if (referrer) {
                if (referrer.isAmbassador) {
                  referrer.payback = referrer.payback + 30 + 10;
                } else {
                  referrer.payback = referrer.payback + 30;
                }
                referrer.save(function(err) {
                  if (err) {
                    console.log(err);
                    return next(err);
                  } else {
                    return next();
                  }
                });
              }
            }
          });
        } else {
          return next();
        }
      } else {
        ctx.instance.lastUpdated = new Date();
        next();
      }
    } else {
      ctx.data.lastUpdated = new Date();
      next();
    }
  });



  Customer.addCustomer = function(email, cb) {
    var user = {
      email: email
    }
    Customer.create(user, function(err, data) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, data);
      }
    });

  };

  Customer.remoteMethod('addCustomer', {
    accepts: [{
      arg: 'email',
      type: 'string',
      required: true
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/addCustomer',
      verb: 'post'
    },
    description: "Endpoint for Adding new Customers"
  });


  Customer.getCustomerById = function(userId, cb) {
    Customer.findById(userId, function(err, customer) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, customer);
      }
    })
  };

  Customer.remoteMethod('getCustomerById', {
    accepts: [{
      arg: 'userId',
      type: 'string',
      required: true
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/getCustomerById',
      verb: 'get'
    },
    description: "Endpoint for getting existing Customers using id"
  });

  Customer.addReferral = function(email, referralId, cb) {
    var user = {
      email: email,
      referralId: referralId
    }
    Customer.create(user, function(err, data) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, data);
      }
    });

  };


  Customer.remoteMethod('addReferral', {
    accepts: [{
      arg: 'email',
      type: 'string',
      required: true
    }, {
      arg: 'referralId',
      type: 'string',
      required: true
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/addReferral',
      verb: 'post'
    },
    description: "Endpoint for Adding new Customers with referralId"
  });




  Customer.fetchAllChildren = function(userId, limit, order, skip, cb) {

    var options = {
      where: {
        referralId: userId
      },
      limit: limit ? limit : 10,
      order: order ? order : 'lastUpdated desc',
      offset: skip ? skip : 0
    };
    Customer.find(options, function(err, children) {
      if (err) {
        return cb(new Error("Some Error Occurred"));
      } else {
        return cb(null, children);
      }
    })

  };

  Customer.remoteMethod('fetchAllChildren', {
    returns: {
      type: 'object',
      root: true
    },
    accepts: [{
      arg: 'userId',
      type: 'string',
      required: true
    }, {
      arg: 'limit',
      type: 'integer',
      required: false
    }, {
      arg: 'order',
      type: 'string',
      required: false
    }, {
      arg: 'skip',
      type: 'integer',
      required: false
    }],
    http: {
      path: '/fetchAllChildren',
      verb: 'get'
    },
    description: "Endpoint for getting all children of a User"
  });

  Customer.fetchAllCustomersWithReferralCount = function(cb) {
    Customer.find({}, function(err, customers) {
      if (err) {
        return cb(err);
      } else {
        async.eachLimit(customers, 10, function(item, asyncCb) {
          console.log(item);
          var options = {
            where: {
              referralId: item.id
            }
          }
          Customer.find(options, function(err, cnt) {
            if (err) {
              return asyncCb(err)
            } else {
              item["referralCount"] = cnt.length;
              return asyncCb();
            }
          })
        }, function(err) {
          if (err) {
            return cb(err);
          } else {
            return cb(null, customers);
          }
        })
      }
    })
  };

  Customer.remoteMethod('fetchAllCustomersWithReferralCount', {
    accepts: [],
    returns: {
      type: 'array',
      root: true
    },
    http: {
      path: '/fetchAllCustomersWithReferralCount',
      verb: 'get'
    },
    description: "Endpoint for getting all customer with referral count"
  });



  Customer.addAmbassador = function(email, cb) {
    var user = {
      email: email,
      isAmbassador: true
    }
    Customer.create(user, function(err, data) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, data);
      }
    });

  };

  Customer.remoteMethod('addAmbassador', {
    accepts: [{
      arg: 'email',
      type: 'string',
      required: true
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/addAmbassador',
      verb: 'post'
    },
    description: "Endpoint for Adding new Ambassador Customer"
  });


  Customer.convertCustomerToAmbassador = function(email, cb) {
    var options = {
      email: email
    }

    var updateData = {
      email: email,
      isAmbassador: true
    }
    Customer.upsertWithWhere(options, updateData, function(err, data) {
      if (err) {
        return cb(err);
      } else {
        return cb(null, data);
      }
    });
  };

  Customer.remoteMethod('convertCustomerToAmbassador', {
    accepts: [{
      arg: 'email',
      type: 'string',
      required: true
    }],
    returns: {
      type: 'object',
      root: true
    },
    http: {
      path: '/convertCustomerToAmbassador',
      verb: 'post'
    },
    description: "Endpoint for Convert Customer to Ambassador Customer"
  });


  Customer.fetchAllAmbassadorChildren = function(userId, limit, order, skip, cb) {
    var options = {
      where: {
        id: userId
      },
      limit: limit ? limit : 10,
      order: order ? order : 'lastUpdated desc',
      offset: skip ? skip : 0
    };
    Customer.findById(options, function(err, customer) {
      if (err) {
        return cb(err);
      } else {
        if (parentCustomer.isAmbassador) {
          Customer.find({
            where: {
              "referralId": customer.id
            }
          }, function(err, customers) {
            if (err) {
              return cb(err);
            } else {
              return cb(null, customers);
            }
          });
        } else {
          return cb(new Error('user is not a Ambassador'))
        }
      }
    });

  };

  Customer.remoteMethod('fetchAllAmbassadorChildren', {
    accepts: [{
      arg: 'userId',
      type: 'string',
      required: true
    }, {
      arg: 'limit',
      type: 'integer',
      required: false
    }, {
      arg: 'order',
      type: 'string',
      required: false
    }, {
      arg: 'skip',
      type: 'integer',
      required: false
    }],
    returns: {
      type: 'array',
      root: true
    },
    http: {
      path: '/fetchAllAmbassadorChildren',
      verb: 'get'
    },
    description: "Endpoint for getting  all children of a Ambassador customer"
  });


  Customer.NthLevelChildren = function(childrens, callback ){
    if (childrens.length > 0) {
      var levelChildren = [];
      async.eachSeries(childrens, function(item, asyncCallback) {
        Customer.find({
          where: {
            "referralId": item.id
          }
        }, function(err, customer) {
          if (err) {
            return asyncCallback(err);
          } else {
            levelChildren = customer;
            return asyncCallback();
          }
        });
      }, function(err) {
        if(err){
          return callback(err);
        }
        return callback(null, levelChildren);
      });
    } else {
      return callback(null, childrens);
    }
  };

  Customer.fetchChildrenAtNthLevel = function(userId, level, cb) {

    Customer.findById(userId, function(err, customer) {
      if (err) {
        return cb(err);
      } else {
        if (customer.isAmbassador) {
          var childrens = [];
          childrens.push(customer);

          for (var i = level; i > 0; i--) {
            Customer.NthLevelChildren(childrens, function(err, res) {
              if (err) {
                return cb(err);
              }
              childrens = res ;
              if (i === 1) {
                return cb(null, res);
              }
            });
          }

        } else {
          return cb(new Error('user is not a Ambassador'))
        }
      }
    });

  };

  Customer.remoteMethod('fetchChildrenAtNthLevel', {
    accepts: [{
      arg: 'userId',
      type: 'string',
      required: true
    }, {
      arg: 'level',
      type: 'number',
      required: true
    }],
    returns: {
      type: 'array',
      root: true
    },
    http: {
      path: '/fetchChildrenAtNthLevel',
      verb: 'get'
    },
    description: "Endpoint for getting  all Nth children of a Ambassador customer"
  });



};
