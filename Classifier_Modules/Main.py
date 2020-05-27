import pika
import json
import os
import time
from  Classifier import handleFeatureMessage

fileDir = os.path.dirname(os.path.abspath(__file__))

with open('config.json') as config_file:
    config = json.load(config_file)

reconnect_attempts = config["reconnect_attempts"]
reconnect_wait_time = config["reconnect_wait_time"]
rabbitmq_host = os.getenv("RABBITMQ_HOST", config["rabbitmq_host"])

class MQConnector:
    task_queue = 'tasks'
    response_queue = 'responses'

    def __init__(self):
        self._conn = None
        self.channel = None

    def send_response(self, data, correlation_id):
        self.channel.basic_publish(exchange='', 
                        routing_key=self.response_queue,
                        properties = pika.BasicProperties(correlation_id=correlation_id),
                        body=data)

    def callback(self, ch, method, properties, body):
        default_response = json.dumps([])
        try:
            decoded_response = json.loads(body)
            features = decoded_response['features']
            classifierType = decoded_response['classifierType']
            result = handleFeatureMessage(features, classifierType)
            encoded_results = json.dumps(result)
            default_response = encoded_results
        except Exception as err:
            print(err)
        finally:
            self.send_response(default_response, properties.correlation_id)

    def connect(self):
        for i in range(reconnect_attempts):
            try:
                connection = pika.BlockingConnection(pika.URLParameters(rabbitmq_host))
                self._conn = connection
                self.channel = connection.channel()

                self.channel.queue_declare(queue=self.task_queue)
                self.channel.queue_declare(queue=self.response_queue)
                return
            except:
                time.sleep(reconnect_wait_time)
                
        raise Exception('Failed to connect RabbitMQ')

    def initialize(self):
        time.sleep(10)

        self.connect()
        self.channel.basic_consume(queue=self.task_queue,
                        auto_ack=True,
                        on_message_callback=self.callback)
        print(' [*] Waiting for messages. To exit press CTRL+C')
        self.channel.start_consuming()




connector = MQConnector()

connector.initialize()
        



