from HKU_main_campus import *
import json
import io

def shortestPath(start, end):
    pathCost = {}
    for k in campus_map:
        pathCost[k] = 999999
    pathCost[start] = 0
    while pathCost:
        visiting = min(pathCost, key=pathCost.get)
        if visiting == end:
            break
        for neighbour in campus_map[visiting]:
            if not (neighbour in pathCost):
                continue
            cost = pathCost[visiting] + campus_map[visiting][neighbour]
            if cost < pathCost[neighbour]:
                pathCost[neighbour] = cost
        del pathCost[visiting]
    return (pathCost[end])

def main():
    location = []
    overallPath = {}
    for k in campus_map:
        location.append(k)
    for start in location:
        currPathSet = {}
        for end in location:
            cost = shortestPath(start, end)
            currPathSet[end] = cost
        overallPath[start] = currPathSet
    correct = True
    for l in location:
        for k in location:
            if overallPath[l][k] != overallPath[k][l]:
                correct = False
                if not correct:
                    print (l,k)
                    break
    
    try:
        to_unicode = unicode
    except NameError:
        to_unicode = str
    
    # Write JSON file
    with io.open('HKU_main_campus.json', 'w', encoding='utf8') as outfile:
        str_ = json.dumps(overallPath, indent=4, sort_keys=True, separators=(',', ': '), ensure_ascii=False)
        outfile.write(to_unicode(str_))

if __name__ == "__main__":
    main()