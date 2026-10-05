export const providers = [
  {id:'qbo',name:'QuickBooks Online',category:'Accounting',adapter:true,setup:'Connect an authorized sandbox company with OAuth 2.0. Tokens are stored encrypted by the server; accounting access is read-only.'},
  {id:'stripe',name:'Stripe',category:'Payments',adapter:true,setup:'Set BIZBETTER_STRIPE_SECRET_KEY server-side using a restricted key with read access to balance transactions.'},
  ...['Xero','FreshBooks','Zoho Books','Wave','Sage Accounting','Sage Intacct','QuickBooks Desktop'].map(name=>({id:name.toLowerCase().replace(/[^a-z0-9]/g,''),name,category:'Accounting',adapter:false,setup:'Connector not implemented. Provider authorization and account-specific API/export access are required.'})),
  ...['Jobber','Housecall Pro','ServiceTitan','ServiceM8','Procore','Buildertrend','FieldEdge','Service Fusion'].map(name=>({id:name.toLowerCase().replace(/[^a-z0-9]/g,''),name,category:'Contractor',adapter:false,setup:'Connector not implemented. API access can depend on your plan or provider partnership.'})),
  ...['Gusto','ADP','Paychex','Square','Google Ads'].map(name=>({id:name.toLowerCase().replace(/[^a-z0-9]/g,''),name,category:'Payroll / payments / marketing',adapter:false,setup:'Connector not implemented. Account authorization and a read-only adapter are required.'}))
];
