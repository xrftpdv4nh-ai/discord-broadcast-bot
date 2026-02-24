const config = require('../config');

class RateLimiter {
    constructor() {
        this.isProcessing = false;
        this.queue = [];
    }
    
    async delay(ms) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }
    
    async processQueue() {
        if (this.isProcessing || this.queue.length === 0) return;
        
        this.isProcessing = true;
        
        while (this.queue.length > 0) {
            const batch = this.queue.splice(0, config.batchSize);
            
            for (const task of batch) {
                try {
                    await task();
                    await this.delay(config.dmDelay);
                } catch (error) {
                    console.error('Error processing task:', error);
                }
            }
            
            if (this.queue.length > 0) {
                console.log(`Waiting ${config.batchDelay}ms before next batch...`);
                await this.delay(config.batchDelay);
            }
        }
        
        this.isProcessing = false;
    }
    
    addTask(task) {
        this.queue.push(task);
        this.processQueue();
    }
    
    getQueueLength() {
        return this.queue.length;
    }
    
    isCurrentlyProcessing() {
        return this.isProcessing;
    }
}

module.exports = new RateLimiter();
