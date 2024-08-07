package log

import (
	"fmt"
	"log"
	"net/http"
	"sync"
	"time"
	"strings"
)

type logMessage struct {
	level   string
	source  string
	message string
}

var logChannel = make(chan logMessage, 1000)
var logEntries []string
var logMutex sync.Mutex

// BroadcastFunc is a function that will be called to broadcast log messages.
var BroadcastFunc func(string)

var logBatch []string
var logBatchMutex sync.Mutex
const batchSize = 100
const batchInterval = 100 * time.Millisecond

func init() {
	go processLogMessages()
	go processLogBatch()
}

func processLogMessages() {
	for logMsg := range logChannel {
		entry := fmt.Sprintf("[%s] [%s] %s", logMsg.level, logMsg.source, logMsg.message)
		logMutex.Lock()
		logEntries = append(logEntries, entry)
		logMutex.Unlock()
		log.Print(entry)

		logBatchMutex.Lock()
		logBatch = append(logBatch, entry)
		if len(logBatch) >= batchSize {
			if BroadcastFunc != nil {
				BroadcastFunc(strings.Join(logBatch, "\n"))
			}
			logBatch = logBatch[:0]
		}
		logBatchMutex.Unlock()
	}
}

func processLogBatch() {
	ticker := time.NewTicker(batchInterval)
	defer ticker.Stop()

	for range ticker.C {
		logBatchMutex.Lock()
		if len(logBatch) > 0 {
			if BroadcastFunc != nil {
				BroadcastFunc(strings.Join(logBatch, "\n"))
			}
			logBatch = logBatch[:0]
		}
		logBatchMutex.Unlock()
	}
}

func LogMessage(level, source, message string) {
	logChannel <- logMessage{level: level, source: source, message: message}
}

func LogInfo(source, message string) {
	LogMessage("INFO", source, message)
}

func LogWarning(source, message string) {
	LogMessage("WARNING", source, message)
}

func LogError(source, message string) {
	LogMessage("ERROR", source, message)
}

func GetLogEntries() []string {
	logMutex.Lock()
	defer logMutex.Unlock()
	return logEntries
}

func WriteErrorResponse(w http.ResponseWriter, statusCode int, err error) {
	LogError("HTTP", err.Error())
	http.Error(w, err.Error(), statusCode)
}