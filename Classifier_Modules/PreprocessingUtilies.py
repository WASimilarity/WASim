from gensim.models.doc2vec import TaggedDocument

def splitCamelCase(functionName):
    words = []
    
    currentWord = ''
    for i, char in enumerate(functionName):

        if(char == '.' or char =='_' or char == '-' ):
            words.append(currentWord)
            currentWord = ''
        elif(char.isupper() ):
            words.append(currentWord)
            currentWord = char.lower()
        else:
            currentWord += char
    words.append(currentWord)

    words = filter(lambda str: str != '', words)
    return list(words)

def splitFunctionNameListIntoWords(functionNameList):
    sentences = functionNameList.split(',')
    splitWords = list(map(splitCamelCase, sentences))
    return list(splitWords)

def getTaggedDocumentRepresentation(functionNameList):
    docs = []
    
    splitWords = splitFunctionNameListIntoWords(functionNameList)

    for i, sentence in enumerate(splitWords):
        tags=[i]
        docs.append(TaggedDocument(sentence, tags))

    return docs

def getAllPurposeLabels():
    purposeLabels = ['Auxiliary Utility','Other Applications', 'Compression Utility', 'Cryptographic Utility', 'Cryptominer', 'Game', 'Grammar Utility', 'Image Processing Utility', 'JavaScript Carrier', 'Numeric Utility', 'WebAssembly Support Tester']
    purposeLabels.sort()
    return purposeLabels

def encodePurpose(purpose):
    purpose = str(purpose)
    labels = getAllPurposeLabels()
    encodedPurpose = [0 for i in range(len(labels))]
    # for i in range(len(labels)):
    #     if(purpose == labels[i]):
    #         encodedPurpose[i] = 1
    # return encodedPurpose
    for i in range(len(labels)):
        if(purpose == labels[i]):
            return i
    
def decodePurpose(encodedLabel):
    labels = getAllPurposeLabels()
    return labels[encodedLabel]

def convertProbArrayIntoDict(probabilityArray):
    labels = getAllPurposeLabels()
    probabiltiesOfLabels = dict()
    for i in range(len(labels)):
        currentLabel = labels[i]
        standardFloatProbabilityArray = float(probabilityArray[i])
        probabiltiesOfLabels[currentLabel] = standardFloatProbabilityArray
    return probabiltiesOfLabels
    

        
# def decodePurpose(encodedLabelArray):
#     labels = getAllPurposeLabels()
#     for i in range(len(labels)):
#         if(encodedLabelArray[i] == 1):
#             return labels[i]
#     return ''  