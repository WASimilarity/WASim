from __future__ import absolute_import, division, print_function, unicode_literals
from collections import namedtuple
from gensim.models import doc2vec, word2vec
from gensim.models.doc2vec import Doc2Vec
from PreprocessingUtilies import getTaggedDocumentRepresentation, splitFunctionNameListIntoWords, encodePurpose, decodePurpose, convertProbArrayIntoDict
import mysql.connector
import json
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.svm import SVC
from sklearn.naive_bayes import BernoulliNB
from sklearn.multioutput import MultiOutputClassifier
from sklearn.metrics import accuracy_score, confusion_matrix, f1_score
from math import floor, ceil
from tensorflow.keras import models
import networkx as nx
from graph2vec.graph2vecModule import Graph2VecModel
import os

fileDir = os.path.dirname(os.path.abspath(__file__))

with open('config.json') as config_file:
    config = json.load(config_file)

with open(fileDir +'/functionNameDoc2Vec.pkl', 'rb') as f:
  functionNameDoc2Vec =  pickle.load(f)

# with open(fileDir +'/graph2vec.pkl', 'rb') as f:
#   graphModel =  pickle.load(f)

with open(fileDir + '/rfClassifier.pkl', 'rb') as f:
  randomForestClassifier = pickle.load(f)

with open(fileDir + '/nBClassifier.pkl', 'rb') as f:
  naiveBayesClassifier = pickle.load(f)

with open(fileDir + '/svmClassifier.pkl', 'rb') as f:
  svmClassifier = pickle.load(f)

neuralClassifier = models.load_model(fileDir + '/neuralNetwork.h5')

def getFunctionNameEmbedding(functionNames):
    splitList = splitFunctionNameListIntoWords(functionNames)
    flattenedSplitList = [item for sublist in splitList for item in sublist]
    return functionNameDoc2Vec.infer_vector(flattenedSplitList)

def preprocessFeatures(features):
    #Word Embeddings
    #1 Split camelCase, hyphens, underscore to get word tokens in function names
    #2 Treat function name as sentence
    #3 Treat ImportFunctions/ExportFunction as paragraph
    importFunctionsVector = getFunctionNameEmbedding(features['ImportFunctions'])
    exportFunctionsVector = getFunctionNameEmbedding(features['ExportFunctions'])
    # graphVector = graphModel.infer_graph_vector(features['CFGEdgeList'])
    #Feature Tuple: NumberOfFunctions | WasmFileSize | WatFileSize | ExpansionFactor | IsAsm | TotalLinesOfCode | MinFunctionLinesOfCode | MaxFunctionLinesOfCode | AvgFunctionLineOfCode | NumberOfTypes | ImportFunctions | ExportFunctions
    featuresOfInterest = ['NumberOfFunctions', 'WasmFileSize', 'WatFileSize', 'ExpansionFactor', 'IsAsm', 'TotalLinesOfCode', 'MinFunctionLinesOfCode', 'MaxFunctionLinesOfCode', 'AvgFunctionLinesOfCode', 'NumberOfTypes', 'NumberOfImports', 'NumberOfExports', 'NumberOfDataSections', 'NumberOfTableEntries']
    featuresOfInterest = list(map(lambda feature: features[feature], featuresOfInterest))
    featuresOfInterest = [y for x in [featuresOfInterest, importFunctionsVector,exportFunctionsVector
    #, graphVector 
                          ] for y in x]

    return featuresOfInterest

def handleFeatureMessage(featuresofFiles, classifierType = 'neural'):
    predictorOptions = {
      'neural': neuralClassifier,
      'random': randomForestClassifier,
      'svm': svmClassifier,
      'naive': naiveBayesClassifier
    }
    if classifierType in predictorOptions.keys():
      predictor = predictorOptions[classifierType]
    else:
      classifierType = 'neural'
      predictor = predictorOptions[classifierType]

    processedFeatures = list(map(preprocessFeatures, featuresofFiles))
    inputVectors = np.array(processedFeatures)
    if classifierType == 'neural':
      prediction = predictor.predict(inputVectors)
    else:
      prediction = predictor.predict_proba(inputVectors)
      print(classifierType +' prediction:', prediction)

    returnVal = list(map(convertProbArrayIntoDict, prediction))
    print('Decoded Prediction:', returnVal)

    return returnVal
