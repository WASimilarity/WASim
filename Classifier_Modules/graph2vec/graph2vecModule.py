#Obtained from https://github.com/benedekrozemberczki/graph2vec/blob/master/src/graph2vec.py
import json
import hashlib
import logging
import pandas as pd
import networkx as nx
from tqdm import tqdm
from joblib import Parallel, delayed
import numpy.distutils.system_info as sysinfo
from gensim.models.doc2vec import Doc2Vec, TaggedDocument

args = {
        "dimensions":10,
        "min_count": 5,
        "down_sampling": 0.0001,
        "workers": 4,
        "epochs": 100,
        "learning_rate": 0.0025,
        "wl_iterations": 20
    }

logging.basicConfig(format="%(asctime)s : %(levelname)s : %(message)s", level=logging.INFO)

class WeisfeilerLehmanMachine:
    """
    Weisfeiler Lehman feature extractor class.
    """
    def __init__(self, graph, features, iterations):
        """
        Initialization method which also executes feature extraction.
        :param graph: The Nx graph object.
        :param features: Feature hash table.
        :param iterations: Number of WL iterations.
        """
        self.iterations = iterations
        self.graph = graph
        self.features = features
        self.nodes = self.graph.nodes()
        self.extracted_features = [str(v) for k,v in features.items()]
        self.do_recursions()

    def do_a_recursion(self):
        """
        The method does a single WL recursion.
        :return new_features: The hash table with extracted WL features.
        """
        new_features = {}
        for node in self.nodes:
            nebs = self.graph.neighbors(node)
            degs = [self.features[neb] for neb in nebs]
            features = "_".join([str(self.features[node])]+sorted([str(deg) for deg in degs]))
            hash_object = hashlib.md5(features.encode())
            hashing = hash_object.hexdigest()
            new_features[node] = hashing
        self.extracted_features = self.extracted_features + list(new_features.values())
        return new_features

    def do_recursions(self):
        """
        The method does a series of WL recursions.
        """
        for iteration in range(self.iterations):
            self.features = self.do_a_recursion()

class Graph2VecModel():
    def __init__(self, graphList):
        self.model = self.build_model(graphList)

    def dataset_reader(self, nxgraph):
        """
        Function to read the graph and features from a json file.
        :param path: The path to the graph json.
        :return graph: The graph object.
        :return features: Features hash table.
        :return name: Name of the graph.
        """

        
        features = list(nxgraph.degree())

        features = {int(k): v for k,v, in features}
        return nxgraph, features

    def feature_extractor(self, nxgraph,rounds):
        """
        Function to extract WL features from a graph.
        :param path: The path to the graph json.
        :param rounds: Number of WL iterations.
        :return doc: Document collection object.
        """
        graph, features = self.dataset_reader(nxgraph)
        machine = WeisfeilerLehmanMachine(graph,features,rounds)
        return machine

    def make_tagged_doc(self, nxgraph, index, rounds):
        machine = self.feature_extractor(nxgraph, rounds)
        doc = TaggedDocument(words = machine.extracted_features , tags = ["g_" + str(index)])
        return doc

            
    # def save_embedding(self, output_path, model, files, dimensions):
    #     """
    #     Function to save the embedding.
    #     :param output_path: Path to the embedding csv.
    #     :param model: The embedding model object.
    #     :param files: The list of files.
    #     :param dimensions: The embedding dimension parameter.
    #     """
    #     out = []
    #     for f in files:
    #         identifier = f.split("/")[-1].strip(".json")
    #         out.append([int(identifier)] + list(model.docvecs["g_"+identifier]))

    #     out = pd.DataFrame(out,columns = ["type"] +["x_" +str(dimension) for dimension in range(dimensions)])
    #     out = out.sort_values(["type"])
    #     out.to_csv(output_path, index = None)

    def infer_graph_vector(self, nxGraphString):
        if nxGraphString == None:
            return [0 for i in range(args["dimensions"])]
        
        if isinstance(nxGraphString, (str)):
            graphJSON = json.loads(nxGraphString)
        else:
            graphJSON = nxGraphString

        nxGraph = nx.Graph()

        nxGraph.add_nodes_from(graphJSON['nodes'])
        nxGraph.add_edges_from(graphJSON['edges'])
        rounds = args["wl_iterations"]
        graphFeatures = self.feature_extractor(nxGraph, rounds).extracted_features
        return self.model.infer_vector(graphFeatures)


    def build_model(self, graphList):
        """
        Main function to read the graph list, extract features, learn the embedding and save it.
        :param args: Object with the arguments.
        """
        

        print("\nFeature extraction started.\n")
        document_collections = Parallel(n_jobs = args["workers"])(delayed(self.make_tagged_doc)(g,idx, args["wl_iterations"]) for idx,g in enumerate(tqdm(graphList)))
        print("\nOptimization started.\n")
        
        model = Doc2Vec(document_collections,
                        size = args["dimensions"],
                        window = 0,
                        min_count = args["min_count"],
                        dm = 0,
                        sample = args["down_sampling"],
                        workers = args["workers"],
                        iter = args["epochs"],
                        alpha = args["learning_rate"])
        return model
    # save_embedding(args.output_path, model, graphs, args.dimensions)

