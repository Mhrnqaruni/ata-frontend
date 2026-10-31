import React from 'react';
import {Box,Alert} from '@mui/material';
import ChoiceCards from '../../common/ChoiceCards';
export default function GradingModeSelector({config,dispatch,disabled}){
 return <Box sx={{mt:3}}><ChoiceCards disabled={disabled} legend="What should answers be marked against?" name="grading-mode"
 value={config.gradingMode||'answer_key_provided'} onChange={value=>dispatch({type:'UPDATE_CONFIG_FIELD',payload:{field:'gradingMode',value}})} options={[
 {value:'answer_key_provided',label:'Reviewed answers and marking scheme',description:'Use the expected answers you checked above.'},
 {value:'ai_auto_grade',label:'AI-prepared marking scheme',description:'Review the shared draft answers above before grading begins.'}
 ]}/>{config.gradingMode==='library'&&<Alert severity="warning">Library-grounded grading is not available here. Choose reviewed answers or an AI-prepared marking scheme.</Alert>}</Box>;
}
