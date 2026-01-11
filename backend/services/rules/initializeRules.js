import mongoose from 'mongoose';
import Rule from '../../models/Rule.js'; // your Rule model
import { predefinedRules } from './predefinedRules.js';

export async function initializeRules () {
    try {
    
        for (const rule of predefinedRules) {
            
            // check if rule already exists
            const exists = await Rule.findOne({ name: rule.name });
            if (!exists) {
                await Rule.create(rule);
                console.log(`Rule "${rule.name}" created.`);
            }
        }
        console.log('All predefined rules initialized.');
    } catch (err) {
        console.error('Error initializing rules:', err);
    }
}

