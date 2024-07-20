import React, { useEffect, useState, useRef } from 'react';
import { useSelector } from 'react-redux';
import { Line } from 'react-chartjs-2';
import 'chart.js/auto';
import 'chartjs-adapter-date-fns';
import { connectWebSocket } from '../services/socket';
import '../css/Console.css';
import Card from '../components/Card';
import { SendOutlined, ShareAltOutlined, ApiOutlined } from '@ant-design/icons';
import { List, Typography } from 'antd';

const { Text } = Typography;

const BrokerConsole = () => {
  const [brokerLogs, setBrokerLogs] = useState([]);
  const [producerLogs, setProducerLogs] = useState([]);
  const [consumerLogs, setConsumerLogs] = useState([]);
  const [totalProducerMessages, setTotalProducerMessages] = useState(0);
  const [totalConsumerReceivedMessages, setTotalConsumerReceivedMessages] = useState(0);
  const [totalBrokerAcknowledgedMessages, setTotalBrokerAcknowledgedMessages] = useState(0);
  const [intervalProducerMessageCount, setIntervalProducerMessageCount] = useState(0);
  const [intervalConsumerReceivedMessageCount, setIntervalConsumerReceivedMessageCount] = useState(0);
  const [intervalBrokerAcknowledgedMessageCount, setIntervalBrokerAcknowledgedMessageCount] = useState(0);

  const [producerChartData, setProducerChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Producer Messages per Interval',
        data: [],
        borderColor: 'rgb(75, 192, 192)',
        tension: 0.1,
        fill: false,
      }
    ]
  });
  const [consumerChartData, setConsumerChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Consumer Messages Received per Interval',
        data: [],
        borderColor: 'rgb(255, 99, 132)',
        tension: 0.1,
        fill: false,
      }
    ]
  });
  const [brokerChartData, setBrokerChartData] = useState({
    labels: [],
    datasets: [
      {
        label: 'Broker Acknowledged Messages per Interval',
        data: [],
        borderColor: 'rgb(54, 162, 235)',
        tension: 0.1,
        fill: false,
      }
    ]
  });

  const user = useSelector(state => state.user);
  const updateInterval = useRef(null);

  useEffect(() => {
    const socket = connectWebSocket(user, (message) => {
      const cleanedMessage = message.replace(/"/g, '');
      if (cleanedMessage.includes('[Producer')) {
        setProducerLogs(prevLogs => [...prevLogs, cleanedMessage]);
        setTotalProducerMessages(prevCount => prevCount + 1);
        setIntervalProducerMessageCount(prevCount => prevCount + 1);
      } else if (cleanedMessage.includes('[Broker') || cleanedMessage.includes('[Redis')) {
        setBrokerLogs(prevLogs => [...prevLogs, cleanedMessage]);
        if (cleanedMessage.includes('acknowledged successfully')) {
          setTotalBrokerAcknowledgedMessages(prevCount => prevCount + 1);
          setIntervalBrokerAcknowledgedMessageCount(prevCount => prevCount + 1);
        }
      } else if (cleanedMessage.includes('[Consumer')) {
        setConsumerLogs(prevLogs => [...prevLogs, cleanedMessage]);
        if (cleanedMessage.includes('received')) {
          setTotalConsumerReceivedMessages(prevCount => prevCount + 1);
          setIntervalConsumerReceivedMessageCount(prevCount => prevCount + 1);
        }
      }
    });

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [user]);

  useEffect(() => {
    updateInterval.current = setInterval(() => {
      const currentTime = new Date();

      setProducerChartData(prevData => {
        const newLabels = [...prevData.labels, currentTime];
        const newDataPoints = [...prevData.datasets[0].data, intervalProducerMessageCount];

        if (newLabels.length > 20) {
          newLabels.shift();
          newDataPoints.shift();
        }

        return {
          ...prevData,
          labels: newLabels,
          datasets: [{ ...prevData.datasets[0], data: newDataPoints }]
        };
      });

      setConsumerChartData(prevData => {
        const newLabels = [...prevData.labels, currentTime];
        const newReceivedDataPoints = [...prevData.datasets[0].data, intervalConsumerReceivedMessageCount];

        if (newLabels.length > 20) {
          newLabels.shift();
          newReceivedDataPoints.shift();
        }

        return {
          ...prevData,
          labels: newLabels,
          datasets: [{ ...prevData.datasets[0], data: newReceivedDataPoints }]
        };
      });

      setBrokerChartData(prevData => {
        const newLabels = [...prevData.labels, currentTime];
        const newAcknowledgedDataPoints = [...prevData.datasets[0].data, intervalBrokerAcknowledgedMessageCount];

        if (newLabels.length > 20) {
          newLabels.shift();
          newAcknowledgedDataPoints.shift();
        }

        return {
          ...prevData,
          labels: newLabels,
          datasets: [{ ...prevData.datasets[0], data: newAcknowledgedDataPoints }]
        };
      });

      setIntervalProducerMessageCount(0);
      setIntervalConsumerReceivedMessageCount(0);
      setIntervalBrokerAcknowledgedMessageCount(0);
    }, 3000);

    return () => clearInterval(updateInterval.current);
  }, [intervalProducerMessageCount, intervalConsumerReceivedMessageCount, intervalBrokerAcknowledgedMessageCount]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time',
        time: {
          unit: 'second',
          stepSize: 10,
          displayFormats: {
            second: 'h:mm:ss a',
          }
        },
        ticks: {
          maxRotation: 0,
          minRotation: 0,
          source: 'auto',
          autoSkip: true,
          maxTicksLimit: 20,
          callback: function (value) {
            const date = new Date(value);
            return date.toLocaleTimeString();
          }
        },
        min: new Date(Date.now() - 60000),
        max: new Date()
      },
      y: {
        beginAtZero: true,
        ticks: {
          stepSize: 1,
          callback: function (value) {
            if (value % 1 === 0) {
              return value;
            }
          }
        }
      }
    },
    animation: {
      duration: 300
    }
  };

  return (
    <div className="console-container">
      <h1>Broker Console</h1>
      <div className='card-area mb-10'>
        <Card logoBackground='bg-sky-200' logo={<SendOutlined />} data={totalProducerMessages} dataTitle='Total Producer Messages Sent' />
        <Card logoBackground='bg-sky-300' logo={<ApiOutlined />} data={totalBrokerAcknowledgedMessages} dataTitle='Total Broker Acknowledged Messages' />
        <Card logoBackground='bg-sky-400' logo={<ShareAltOutlined />} data={totalConsumerReceivedMessages} dataTitle='Total Consumer Messages Received' />
      </div>

      <h1>Monitor Chart</h1>
      <div className="charts-container">
        <div className="chart-wrapper">
          <Line data={producerChartData} options={chartOptions} />
        </div>
        <div className="chart-wrapper">
          <Line data={consumerChartData} options={chartOptions} />
        </div>
        <div className="chart-wrapper">
          <Line data={brokerChartData} options={chartOptions} />
        </div>
      </div>

      <h1>Components Logs</h1>
      <div className='w-full'>
        {/* Broker & Redis Logs */}
        <div>
          <h2 className='mb-3 text-gray-500 font-medium'>Broker & Redis Logs</h2>
          <div className='bg-orange-100 py-5 px-5 mb-10 max-h-60 overflow-y-auto overflow-x-hidden'>
            <List
              itemLayout='horizontal'
              dataSource={brokerLogs}
              renderItem={(item) => (
                <List.Item>
                  {item.trim().startsWith('[ERROR]') ? <Text type="danger">{item}</Text>
                    :
                    item.trim().startsWith('[WARNING]') ? <Text type="warning">{item}</Text> : item}
                </List.Item>
              )}
            />
          </div>
        </div>
        {/* Producer Logs */}
        <div>
          <h2 className='mb-3 text-gray-500 font-medium'>Producer Logs</h2>
          <div className='bg-indigo-200 py-5 px-5 mb-10 max-h-60 overflow-y-auto overflow-x-hidden'>
            <List
              itemLayout='horizontal'
              dataSource={producerLogs}
              renderItem={(item) => (
                <List.Item>
                  {item.trim().startsWith('[ERROR]') ? <Text type="danger">{item}</Text>
                    :
                    item.trim().startsWith('[WARNING]') ? <Text type="warning">{item}</Text> : item}
                </List.Item>
              )}
            />
          </div>
        </div>
        {/* Consumer Logs */}
        <div>
          <h2 className='mb-3 text-gray-500 font-medium'>Consumer Logs</h2>
          <div className='bg-cyan-100 py-5 px-5 max-h-60 overflow-y-auto overflow-x-hidden'>
            <List
              itemLayout='horizontal'
              dataSource={consumerLogs}
              renderItem={(item) => (
                <List.Item>
                  {item.trim().startsWith('[ERROR]') ? <Text type="danger">{item}</Text>
                    :
                    item.trim().startsWith('[WARNING]') ? <Text type="warning">{item}</Text> : item}
                </List.Item>
              )}
            />
          </div>
        </div>
      </div>

      {/* <div className="log-section broker-logs">
        <h2>Broker & Redis Logs</h2>
        <div className="console-logs">
          {brokerLogs.map((log, index) => (
            <p key={index} className="console-log">{log}</p>
          ))}
        </div>
      </div>
      <div className="log-section producer-consumer-logs">
        <div className="log-subsection producer-logs">
          <h2>Producer Logs</h2>
          <div className="console-logs">
            {producerLogs.map((log, index) => (
              <p key={index} className="console-log">{log}</p>
            ))}
          </div>
        </div>
        <div className="log-subsection consumer-logs">
          <h2>Consumer Logs</h2>
          <div className="console-logs">
            {consumerLogs.map((log, index) => (
              <p key={index} className="console-log">{log}</p>
            ))}
          </div>
        </div>
      </div> */}
    </div>
  );
};

export default BrokerConsole;
