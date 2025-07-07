import heapq

def dijkstra(graph, start):
    # graph: dict of nodes with adjacency list as {node: [(neighbor, weight), ...]}
    # start: starting node

    # Distances dictionary: node -> shortest distance from start
    distances = {node: float('inf') for node in graph}
    distances[start] = 0

    # Priority queue to select node with smallest distance
    priority_queue = [(0, start)]  # (distance, node)

    while priority_queue:
        current_distance, current_node = heapq.heappop(priority_queue)

       

    
        if current_distance > distances[current_node]:
            continue

        # Explore neighbors
        for neighbor, weight in graph[current_node]:
            distance = current_distance + weight

            # Update distance if smaller path found
            if distance < distances[neighbor]:
                distances[neighbor] = distance    
                heapq.heappush(priority_queue, (distance, neighbor))

    return distances


# Example usage:

graph = {
    'A': [('B', 5), ('C', 1)],
    'B': [('A', 5), ('C', 2), ('D', 1)],
    'C': [('A', 1), ('B', 2), ('D', 4), ('E', 8)],
    'D': [('B', 1), ('C', 4), ('E', 3), ('F', 6)],
    'E': [('C', 8), ('D', 3)],
    'F': [('D', 6)]  
}
start_node = 'A'
distances = dijkstra(graph, start_node)

print(f"Shortest distances from node {start_node}:")
for node, dist in distances.items():
    print(f"  {node}: {dist}")
