import test from 'node:test';
import assert from 'node:assert/strict';
import {sortRows} from '../src/utils/tableSort.js';
import {assessmentDestination} from '../src/utils/assessmentNavigation.js';
test('missing last both ways, explicit percentages and stable ties',()=>{
 const rows=[{id:'b',x:null},{id:'a',x:null},{id:'z',x:0},{id:'p',x:1},{id:'r',x:90}];
 assert.deepEqual(sortRows(rows,'x','percentage','desc').map(r=>r.id),['r','p','z','a','b']);
 assert.deepEqual(sortRows(rows,'x','percentage').map(r=>r.id),['z','p','r','a','b']);
 assert.equal(sortRows([{id:'a',x:'4bad'},{id:'b',x:0}],'x','number')[0].id,'b');
});
test('each assessment opens an existing record without dispatch',()=>{
 for(const status of ['Completed','Pending Review'])assert.equal(assessmentDestination({id:'x',status}),'/assessments/x/results');
 assert.equal(assessmentDestination({id:'x',status:'Failed'}),'/assessments/new?retryJobId=x');
 for(const status of ['Queued','Processing','Summarizing'])assert.equal(assessmentDestination({id:'x',status}),'/assessments?focus=x');
});

import {normalizeMathText} from '../src/utils/mathRenderer.js';
test('standalone paper equations render without correcting an answer or touching prose',()=>{
 assert.equal(normalizeMathText('Differentiate with respect to x.\ny = sin(3x²)\ndy/dx ='),'Differentiate with respect to x.\n$y = sin(3x^2)$\n$\\frac{dy}{dx} =$');
 assert.equal(normalizeMathText('The answer cos(3x²) is incomplete.'),'The answer cos(3x²) is incomplete.');
 assert.equal(normalizeMathText('Price $5.00'),'Price $5.00');
});
